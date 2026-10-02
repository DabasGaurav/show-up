import "server-only";
import { randomBytes } from "node:crypto";
import { createOrg, getOrgForUser, type NewOrg } from "@/lib/data/orgs";
import { query, queryOne } from "@/lib/db";
import { MSG } from "@/lib/messages";
import { sendEmail } from "@/lib/notify";

// Sign up and sign in both finish with a link in the inbox. Sign-up carries the
// person's details (and, for an NGO, the NGO's details); sign-in carries only the
// email of an account that already exists. No passwords.

const TTL_MIN = 30;
const key = (token: string) => `signin:${token}`;

export interface SignUp {
  name: string;
  /** Volunteers give their mobile on the first spot they save; NGO coordinators give it here. */
  phone?: string;
  city?: string | null;
  causes?: string[];
  /** Present on NGO sign-up. The NGO is created, waiting for approval, when the link is opened. */
  org?: NewOrg;
}

export interface Pending {
  email: string;
  next: string;
  signup?: SignUp;
  expires: number;
}


export async function hasAccount(email: string): Promise<boolean> {
  return (await queryOne("select 1 as found from users where lower(email) = lower($1)", [email])) !== null;
}

export async function startSignIn(p: Omit<Pending, "expires">, origin: string): Promise<{ ok: true; link: string | null } | { ok: false; error: string }> {
  const token = randomBytes(24).toString("base64url");
  await query("insert into app_state (key, value) values ($1, $2::jsonb)", [
    key(token),
    JSON.stringify({ ...p, expires: Date.now() + TTL_MIN * 60_000 }),
  ]);
  const link = `${origin}/signin/${token}`;
  const result = await sendEmail({ type: "sign_in", to: p.email, text: MSG.signInLink({ link }) });
  if (result === "sent") return { ok: true, link: null };
  // No email provider: only acceptable off the live site, where we show the link instead.
  if (result === "logged" && process.env.NODE_ENV !== "production") return { ok: true, link };
  return { ok: false, error: "We couldn't send the email just now. Please try again in a minute." };
}

/** Uses up the link and returns the signed-in user's id and where to go next. */
export async function finishSignIn(token: string): Promise<{ userId: string; next: string } | null> {
  const row = await queryOne<{ value: Pending }>("delete from app_state where key = $1 returning value", [key(token)]);
  if (!row || row.value.expires < Date.now()) return null;
  const p = row.value;
  const s = p.signup;
  // The email is what the person has just proved is theirs, so that is who they are.
  // (Matching on the mobile number would let someone claim another person's account.)
  const existing = await queryOne<{ id: string }>(
    "select id from users where lower(email) = lower($1) order by created_at limit 1",
    [p.email],
  );
  let userId: string;
  if (existing) {
    userId = existing.id;
    await query("update users set last_active_at = now() where id = $1", [userId]);
  } else {
    if (!s) return null;
    const phoneFree = Boolean(s.phone) && (await queryOne("select 1 as taken from users where phone = $1", [s.phone])) === null;
    const [u] = await query<{ id: string }>(
      "insert into users (name, phone, email, city, saved_causes) values ($1, $2, $3, $4, $5) returning id",
      [s.name, phoneFree ? s.phone : null, p.email, s.city ?? null, s.causes ?? []],
    );
    userId = u.id;
  }
  if (s?.org && !(await getOrgForUser(userId))) await createOrg(userId, s.org);
  return { userId, next: p.next };
}
