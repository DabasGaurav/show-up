import "server-only";
import { createOrg, type NewOrg } from "@/lib/data/orgs";
import { query, queryOne } from "@/lib/db";
import { checkPassword, hashPassword } from "@/lib/password";

// Accounts: sign up with an email and a password, sign in with the same two.

export interface NewAccount {
  name: string;
  email: string;
  password: string;
  city?: string | null;
  causes?: string[];
  phone?: string | null;
  /** NGO sign-up: the NGO is created with the account, waiting for approval. */
  org?: NewOrg;
}

/** Creates the account (and the NGO, if given). Returns null when the email is already taken. */
export async function createAccount(a: NewAccount): Promise<string | null> {
  const email = a.email.trim().toLowerCase();
  if (await queryOne("select 1 as taken from users where lower(email) = $1", [email])) return null;
  const phoneFree = Boolean(a.phone) && (await queryOne("select 1 as taken from users where phone = $1", [a.phone])) === null;
  const [u] = await query<{ id: string }>(
    "insert into users (name, email, password_hash, phone, city, saved_causes) values ($1, $2, $3, $4, $5, $6) returning id",
    [a.name, email, hashPassword(a.password), phoneFree ? a.phone : null, a.city ?? null, a.causes ?? []],
  );
  if (a.org) await createOrg(u.id, a.org);
  return u.id;
}

export type Login = { ok: true; userId: string } | { ok: false; why: "unknown" | "no_password" | "wrong" };

export async function login(email: string, password: string): Promise<Login> {
  const u = await queryOne<{ id: string; password_hash: string | null }>(
    "select id, password_hash from users where lower(email) = lower($1) order by created_at limit 1", [email.trim()]);
  if (!u) return { ok: false, why: "unknown" };
  if (!u.password_hash) return { ok: false, why: "no_password" };
  if (!checkPassword(password, u.password_hash)) return { ok: false, why: "wrong" };
  await query("update users set last_active_at = now() where id = $1", [u.id]);
  return { ok: true, userId: u.id };
}

export async function setPassword(userId: string, password: string): Promise<void> {
  await query("update users set password_hash = $2 where id = $1", [userId, hashPassword(password)]);
}
