import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";

// Session = signed, http-only cookie holding the user id. It is issued only after
// the person opens their email link (lib/signin.ts).

const USER_COOKIE = "su_uid";
const ADMIN_COOKIE = "su_admin";
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
  (await cookies()).set(USER_COOKIE, seal(userId), cookieOpts);
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(USER_COOKIE);
}

export async function getUser(): Promise<User | null> {
  const id = unseal((await cookies()).get(USER_COOKIE)?.value);
  if (!id) return null;
  return queryOne<User>("select * from users where id = $1", [id]);
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
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (unseal((await cookies()).get(ADMIN_COOKIE)?.value) === "admin") return true;
  return (await getUser())?.role === "admin";
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | undefined | null, fallback = "/me"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
