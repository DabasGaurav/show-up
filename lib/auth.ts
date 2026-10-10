import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";

// Session = signed, http-only cookie holding the user id. It is issued only after
// the person opens their email link (lib/signin.ts).

const USER_COOKIE = "su_uid";
const ADMIN_COOKIE = "su_admin";
/** Admin only: the person whose pages the team is looking at ("Viewing as …"). */
const AS_COOKIE = "su_as";
const MAX_AGE = 60 * 60 * 24 * 60;

const DEV_SECRET = "dev-only-secret-change-me";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return DEV_SECRET;
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function seal(value: string): string {
  return `${value}.${sign(value)}`;
}

function unseal(sealed: string | undefined): string | null {
  if (!sealed) return null;
  const i = sealed.lastIndexOf(".");
  if (i < 1) return null;
  const value = sealed.slice(0, i);
  const a = Buffer.from(sealed.slice(i + 1));
  const b = Buffer.from(sign(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export interface User {
  id: string;
  role: "volunteer" | "ngo_member" | "admin";
  name: string;
  phone: string | null;
  phone_verified_at: Date | null;
  email: string | null;
  city: string | null;
  is_online_ok: boolean;
  saved_causes: string[];
  created_at: Date;
  last_active_at: Date;
}

export async function signIn(userId: string): Promise<void> {
  // Signing in or out always ends any "Viewing as": you are then exactly who you signed in as.
  (await cookies()).delete(AS_COOKIE);
  (await cookies()).set(USER_COOKIE, seal(userId), cookieOpts);
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(AS_COOKIE);
  (await cookies()).delete(USER_COOKIE);
}

const adminCookie = async () => unseal((await cookies()).get(ADMIN_COOKIE)?.value) === "admin";

/** The id the team is viewing as, if any. Only honoured with the admin cookie. */
async function viewingId(): Promise<string | null> {
  const as = unseal((await cookies()).get(AS_COOKIE)?.value);
  return as && (await adminCookie()) ? as : null;
}

/** The signed-in person, or the person an admin is viewing as. One lookup per request. */
export const getUser = cache(async (): Promise<User | null> => {
  const id = (await viewingId()) ?? unseal((await cookies()).get(USER_COOKIE)?.value);
  if (!id) return null;
  return queryOne<User>("select * from users where id = $1", [id]);
});

/** Set while an admin is looking at someone's pages. */
export async function viewingAs(): Promise<User | null> {
  return (await viewingId()) ? getUser() : null;
}

export async function viewAs(userId: string): Promise<void> {
  if (!(await adminCookie())) throw new Error("Not allowed");
  (await cookies()).set(AS_COOKIE, seal(userId), { ...cookieOpts, maxAge: 60 * 60 * 4 });
}

export async function stopViewing(): Promise<void> {
  (await cookies()).delete(AS_COOKIE);
}

/** Sends the visitor to sign in, then back to `next`. */
export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

// --- Admin: team logins only ---

function adminPasscode(): string {
  const env = process.env.ADMIN_PASSCODE;
  if (env) return env;
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_PASSCODE is not set");
  return "showup-admin";
}

export async function unlockAdmin(passcode: string): Promise<boolean> {
  const expected = Buffer.from(adminPasscode());
  const given = Buffer.from(passcode);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  (await cookies()).set(ADMIN_COOKIE, seal("admin"), cookieOpts);
  return true;
}

export async function lockAdmin(): Promise<void> {
  (await cookies()).delete(AS_COOKIE);
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (await adminCookie()) return true;
  const id = unseal((await cookies()).get(USER_COOKIE)?.value);
  return id ? (await queryOne<{ role: string }>("select role from users where id = $1", [id]))?.role === "admin" : false;
}

/**
 * Only allow moves within this site: a path that starts with one "/". Anything a
 * browser could read as another site ("//x", "/\\x", or with hidden characters) is refused.
 */
export function safeNext(next: string | undefined | null, fallback = "/me"): string {
  return next && /^\/(?![/\\])[^\\\u0000-\u001f\u007f]*$/.test(next) ? next : fallback;
}
