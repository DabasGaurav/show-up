import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import type { IdStatus, TrustLevel } from "@/lib/rules";

// Session = signed, http-only cookie holding the user id. Phone ownership is
// proven by the phone check (lib/otp.ts) before a session is issued.

const USER_COOKIE = "su_uid";
const ADMIN_COOKIE = "su_admin";
const LAB_COOKIE = "su_lab";
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
  level: TrustLevel;
  id_status: IdStatus;
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

/** Sends the visitor through the phone check, then back to `next`. */
export async function requireUser(next: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/verify?next=${encodeURIComponent(next)}`);
  return user;
}

// --- Team-only areas: admin console and Test Lab (passcode, §13) ---

function passcodeFor(kind: "admin" | "lab"): string {
  const env = kind === "admin" ? process.env.ADMIN_PASSCODE : process.env.LAB_PASSCODE;
  if (env) return env;
  if (process.env.NODE_ENV === "production") throw new Error(`${kind.toUpperCase()}_PASSCODE is not set`);
  return kind === "admin" ? "showup-admin" : "showup-lab";
}

export async function unlock(kind: "admin" | "lab", passcode: string): Promise<boolean> {
  const expected = Buffer.from(passcodeFor(kind));
  const given = Buffer.from(passcode);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  (await cookies()).set(kind === "admin" ? ADMIN_COOKIE : LAB_COOKIE, seal(kind), cookieOpts);
  return true;
}

export async function lock(kind: "admin" | "lab"): Promise<void> {
  (await cookies()).delete(kind === "admin" ? ADMIN_COOKIE : LAB_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (unseal((await cookies()).get(ADMIN_COOKIE)?.value) === "admin") return true;
  return (await getUser())?.role === "admin";
}

/** The Test Lab opens with its own passcode, or for anyone already in the admin console. */
export async function isLabUnlocked(): Promise<boolean> {
  if (unseal((await cookies()).get(LAB_COOKIE)?.value) === "lab") return true;
  return isAdmin();
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | undefined | null, fallback = "/me"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
