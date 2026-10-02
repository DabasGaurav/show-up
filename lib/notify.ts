import "server-only";
import { query } from "@/lib/db";
import { SUBJECT } from "@/lib/messages";

// Every email goes through here. Each one is recorded, and a `key` makes sure the
// same email is never sent twice however often the jobs run.

export interface Email {
  type: keyof typeof SUBJECT | string;
  to: string | null | undefined;
  text: string;
  userId?: string | null;
  /** Added to the subject, e.g. the activity title. */
  about?: string;
  key?: string;
  /** About a spot loaded with the launch listings: never emailed. */
  seed?: boolean;
}

/** Addresses on the reserved .test domain (our launch listings use @showup.test) must never get mail. */
export const isTestAddress = (to: string) => /\.test$/i.test(to.trim());

async function deliver(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // No email provider configured: print it so it can be read while testing.
    console.log(`[show-up] email to ${to} · ${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Show-Up <onboarding@resend.dev>", to, subject, text }),
  });
  if (!res.ok) console.error(`[show-up] email failed (${res.status}) to ${to}`);
  return res.ok;
}

/** Returns "sent", "logged" (no provider set up), "failed", "duplicate", or "skipped" (launch-listing data). */
export async function sendEmail(e: Email): Promise<"sent" | "logged" | "failed" | "duplicate" | "skipped"> {
  if (!e.to) return "failed";
  // The guard lives here, in the sender, so no caller can get round it.
  if (e.seed || isTestAddress(e.to)) return "skipped";
  const subject = [SUBJECT[e.type] ?? "Show-Up", e.about].filter(Boolean).join(" · ");
  const rows = await query<{ id: string }>(
    `insert into notifications (user_id, type, channel, payload, status, dedupe_key)
     values ($1, $2, 'email', $3::jsonb, 'queued', $4)
     on conflict (dedupe_key) do nothing
     returning id`,
    [e.userId ?? null, e.type, JSON.stringify({ to: e.to, subject, text: e.text }), e.key ?? null],
  );
  if (rows.length === 0) return "duplicate";
  const ok = await deliver(e.to, subject, e.text);
  if (ok) await query("update notifications set status = 'sent', sent_at = now() where id = $1", [rows[0].id]);
  return ok ? "sent" : process.env.RESEND_API_KEY ? "failed" : "logged";
}
