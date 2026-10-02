import "server-only";
import { query } from "@/lib/db";
import { isPrototype } from "@/lib/flags";

// One place every outgoing message passes through (PRD §8.1).
//  - prototype: nothing is sent; the row appears in the Message preview panel.
//  - mvp: email is sent automatically (Resend); WhatsApp rows are queued as
//    `manual_pending` for the admin Reminders queue; SMS is only used for OTP.

export type Channel = "sms" | "whatsapp" | "email" | "in_app";

export interface Message {
  type: string;
  channel: Channel;
  text: string;
  to?: string | null;
  subject?: string;
  userId?: string | null;
  link?: string;
  /** When the message is due; defaults to now. */
  dueAt?: Date;
  /** Same key is never stored twice — keeps scheduled jobs idempotent (§13). */
  dedupeKey?: string;
  /** Extra data for the admin queue (booking, task…). */
  meta?: Record<string, unknown>;
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[show-up] email not sent (RESEND_API_KEY missing) → ${to}: ${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Show-Up <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) console.error(`[show-up] email failed (${res.status}) → ${to}`);
  return res.ok;
}

/** Returns false when the message already exists (same dedupeKey). */
export async function notify(m: Message): Promise<boolean> {
  const payload = { to: m.to ?? null, text: m.text, subject: m.subject ?? null, link: m.link ?? null, ...m.meta };
  const manual = !isPrototype && m.channel === "whatsapp";
  const rows = await query<{ id: string }>(
    `insert into notifications (user_id, type, channel, payload, due_at, status, dedupe_key)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7)
     on conflict (dedupe_key) do nothing
     returning id`,
    [
      m.userId ?? null,
      m.type,
      m.channel,
      JSON.stringify(payload),
      m.dueAt ?? new Date(),
      manual ? "manual_pending" : "queued",
      m.dedupeKey ?? null,
    ],
  );
  if (rows.length === 0) return false;
  if (manual) return true;

  // Prototype: "sent" means shown in the Message preview. MVP: really send email.
  let sent = true;
  if (!isPrototype && m.channel === "email" && m.to) {
    sent = await sendEmail(m.to, m.subject ?? "Show-Up", m.link ? `${m.text}\n\n${m.link}` : m.text);
  }
  if (sent) {
    await query("update notifications set status = 'sent', sent_at = now() where id = $1", [rows[0].id]);
  }
  return true;
}
