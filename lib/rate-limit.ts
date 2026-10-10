import "server-only";
import { headers } from "next/headers";
import { query, queryOne } from "@/lib/db";

// A simple counter in the database: "how many times has this happened lately?"

/** True when `key` has been noted `max` times or more in the last `minutes`. */
export async function tooMany(key: string, max: number, minutes: number): Promise<boolean> {
  const row = await queryOne<{ n: number }>("select count(*)::int as n from auth_attempts where key = $1 and at > now() - ($2 || ' minutes')::interval", [key, String(minutes)]);
  return (row?.n ?? 0) >= max;
}

export async function note(key: string): Promise<void> {
  await query("insert into auth_attempts (key) values ($1)", [key]);
  // Old rows are of no use; clear them as we go.
  await query("delete from auth_attempts where at < now() - interval '1 day'");
}

export async function forget(key: string): Promise<void> {
  await query("delete from auth_attempts where key = $1", [key]);
}

/** The visitor's address as the host reports it, for per-visitor limits. */
export async function visitor(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export const LIMITS = {
  /** Wrong passwords for one email before a pause. */
  wrongPasswords: { max: 8, minutes: 15 },
  /** Wrong passwords from one visitor, across any emails. */
  wrongFromVisitor: { max: 30, minutes: 15 },
  /** New accounts from one visitor. */
  signUps: { max: 10, minutes: 60 },
  /** Wrong admin passcodes from one visitor. */
  adminTries: { max: 8, minutes: 15 },
} as const;
