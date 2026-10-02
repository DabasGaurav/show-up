import "server-only";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { MSG } from "@/lib/messages";
import { sendEmail } from "@/lib/notify";

// Sign in by email link: name, mobile and email on one screen, then a link in the
// inbox. Opening it signs the person in. No passwords and no account page.

const TTL_MIN = 30;
const key = (token: string) => `signin:${token}`;

export interface Pending {
  name: string;
  phone: string;
  email: string;
  next: string;
  expires: number;
}

/** True when emails are really sent. Otherwise the link is shown on screen (local testing only). */
export const emailReady = () => Boolean(process.env.RESEND_API_KEY);

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
  // The email is what the person has just proved is theirs, so that is who they are.
  // (Matching on the mobile number would let someone claim another person's account.)
  const existing = await queryOne<{ id: string }>(
    "select id from users where lower(email) = lower($1) order by created_at limit 1",
    [p.email],
  );
  const phoneFree = (await queryOne("select 1 as taken from users where phone = $1 and lower(coalesce(email, '')) <> lower($2)", [p.phone, p.email])) === null;
  if (existing) {
    await query(
      "update users set name = $2, phone = case when $4 then $3 else phone end, phone_verified_at = coalesce(phone_verified_at, now()), last_active_at = now() where id = $1",
      [existing.id, p.name, p.phone, phoneFree],
    );
    return { userId: existing.id, next: p.next };
  }
  const [u] = await query<{ id: string }>(
    "insert into users (name, phone, email, phone_verified_at) values ($1, $2, $3, now()) returning id",
    [p.name, phoneFree ? p.phone : null, p.email],
  );
  return { userId: u.id, next: p.next };
}
