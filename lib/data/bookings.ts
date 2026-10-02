import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { track } from "@/lib/events";
import { isEnabled, isPrototype } from "@/lib/flags";
import { fmtDate, fmtDateTime, fmtPhone, fmtTime, mapLink } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { notify } from "@/lib/notify";
import {
  ACTIVE_STATUSES,
  canBook,
  freeReleaseDeadline,
  initialBookingStatus,
  pausedUntil,
  releaseType,
  trustLevel,
  turnout,
  type BookingBlock,
  type BookingFact,
  type BookingStatus,
  type TrustLevel,
} from "@/lib/rules";
import type { ReleaseReason } from "@/lib/constants";
import type { MinTrust } from "@/lib/rules";

/** A booking joined with its occurrence, task and organisation. */
export interface BookingView {
  id: string;
  user_id: string;
  occurrence_id: string;
  status: BookingStatus;
  source: "link" | "feed" | "standby" | "admin";
  confirm_token: string;
  confirmed_at: Date | null;
  released_at: Date | null;
  release_reason: ReleaseReason | null;
  decided_at: Date | null;
  created_at: Date;
  start_at: Date;
  end_at: Date;
  task_id: string;
  title: string;
  cause: string;
  role: string;
  done_definition: string;
  mode: "onsite" | "online";
  city: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  online_link: string | null;
  duration_min: number;
  slots_needed: number;
  min_trust: MinTrust;
  booking_mode: "instant" | "approval";
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  share_slug: string;
  org_id: string;
  org_name: string;
  // The volunteer.
  user_name: string;
  user_phone: string | null;
  user_email: string | null;
}

const VIEW = `
  select b.*, oc.start_at, oc.end_at,
         t.id as task_id, t.title, t.cause, t.role, t.done_definition, t.mode, t.city, t.address, t.lat, t.lng,
         t.online_link, t.duration_min, t.slots_needed, t.min_trust, t.booking_mode,
         t.contact_name, t.contact_role, t.contact_phone, t.share_slug,
         o.id as org_id, o.name as org_name,
         u.name as user_name, u.phone as user_phone, u.email as user_email
  from bookings b
  join task_occurrences oc on oc.id = b.occurrence_id
  join tasks t on t.id = oc.task_id
  join organisations o on o.id = t.org_id
  join users u on u.id = b.user_id`;

export const newToken = () => randomBytes(18).toString("base64url");

export async function getBooking(id: string): Promise<BookingView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<BookingView>(`${VIEW} where b.id = $1`, [id]);
}

export async function getBookingByToken(token: string): Promise<BookingView | null> {
  return queryOne<BookingView>(`${VIEW} where b.confirm_token = $1`, [token]);
}

export async function listBookingsForUser(userId: string): Promise<BookingView[]> {
  return query<BookingView>(`${VIEW} where b.user_id = $1 order by oc.start_at desc`, [userId]);
}

export async function listBookingsForOccurrence(occurrenceId: string): Promise<BookingView[]> {
  return query<BookingView>(`${VIEW} where b.occurrence_id = $1 order by b.created_at`, [occurrenceId]);
}

/** The viewer's live booking (or pending request) for an occurrence, if any. */
export async function activeBookingFor(userId: string, occurrenceId: string): Promise<BookingView | null> {
  return queryOne<BookingView>(
    `${VIEW} where b.user_id = $1 and b.occurrence_id = $2
       and b.status in ('requested','booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')`,
    [userId, occurrenceId],
  );
}

/** Everything the rules need to know about a volunteer's history. */
export async function bookingFacts(userId: string): Promise<BookingFact[]> {
  const rows = await query<{ status: BookingStatus; start_at: Date; duration_min: number }>(
    `select b.status, oc.start_at, t.duration_min
     from bookings b
     join task_occurrences oc on oc.id = b.occurrence_id
     join tasks t on t.id = oc.task_id
     where b.user_id = $1`,
    [userId],
  );
  return rows.map((r) => ({ status: r.status, startAt: r.start_at, durationMin: r.duration_min }));
}

/** The volunteer's current trust level. MVP1: everyone is New (§5.1). */
export async function currentLevel(user: Pick<User, "id" | "id_status">, now: Date): Promise<TrustLevel> {
  if (!isEnabled("F8")) return "new";
  return trustLevel(user.id_status, await bookingFacts(user.id), now);
}

export function messageTask(b: Pick<BookingView, "title" | "org_name" | "start_at">) {
  return { task: b.title, ngo: b.org_name, date: fmtDate(b.start_at), time: fmtTime(b.start_at) };
}

/**
 * Sends a message to a volunteer about a booking.
 * Prototype: one WhatsApp-style row in the Message preview.
 * MVP1: an automatic email, plus (for reminders) a row in the admin WhatsApp queue.
 */
export async function messageVolunteer(
  b: BookingView,
  type: string,
  text: string,
  opts: { link?: string; whatsappQueue?: boolean; dueAt?: Date; dedupe?: boolean } = {},
): Promise<void> {
  const key = opts.dedupe === false ? undefined : `${type}:${b.id}`;
  const meta = { booking_id: b.id, occurrence_id: b.occurrence_id, name: b.user_name, task: b.title, start_at: b.start_at };
  if (isPrototype) {
    await notify({ type, channel: "whatsapp", text, to: b.user_phone, userId: b.user_id, link: opts.link, dueAt: opts.dueAt, dedupeKey: key, meta });
    return;
  }
  if (b.user_email) {
    await notify({
      type, channel: "email", text, to: b.user_email, userId: b.user_id, link: opts.link, dueAt: opts.dueAt,
      subject: `${b.title} · ${fmtDateTime(b.start_at)}`, dedupeKey: key && `${key}:email`, meta,
    });
  }
  if (opts.whatsappQueue) {
    await notify({ type, channel: "whatsapp", text, to: b.user_phone, userId: b.user_id, link: opts.link, dueAt: opts.dueAt, dedupeKey: key && `${key}:wa`, meta });
  }
}

/** Sends a message to the organisation's coordinators. */
export async function messageOrg(orgId: string, type: string, text: string, link?: string, dedupeKey?: string): Promise<void> {
  const members = await query<{ id: string; phone: string | null; email: string | null }>(
    "select u.id, u.phone, u.email from org_members m join users u on u.id = m.user_id where m.org_id = $1",
    [orgId],
  );
  for (const m of members) {
    if (isPrototype) {
      await notify({ type, channel: "whatsapp", text, to: m.phone, userId: m.id, link, dedupeKey: dedupeKey && `${dedupeKey}:${m.id}` });
    } else if (m.email) {
      await notify({ type, channel: "email", text, to: m.email, userId: m.id, link, subject: "Show-Up update", dedupeKey: dedupeKey && `${dedupeKey}:${m.id}` });
    }
  }
}

export type BookResult = { ok: true; booking: BookingView } | { ok: false; reason: BookingBlock };

export interface BookInput {
  user: User;
  occurrenceId: string;
  source: BookingView["source"];
  now: Date;
  origin: string;
  /** Standby and admin fills skip the approval step. */
  skipApproval?: boolean;
}

/** Books a seat (§5.2). Approval tasks create a request the NGO must answer within 48h. */
export async function createBooking(i: BookInput): Promise<BookResult> {
  const occ = await queryOne<{
    start_at: Date; slots_needed: number; min_trust: MinTrust; booking_mode: "instant" | "approval"; seats: number;
  }>(
    `select oc.start_at, t.slots_needed, t.min_trust, t.booking_mode,
            (select count(*)::int from bookings b where b.occurrence_id = oc.id
               and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')) as seats
     from task_occurrences oc join tasks t on t.id = oc.task_id
     where oc.id = $1`,
    [i.occurrenceId],
  );
  if (!occ) return { ok: false, reason: "started" };

  const facts = await bookingFacts(i.user.id);
  const enforceTrust = isEnabled("F13") && isEnabled("F14");
  const check = canBook({
    seatsLeft: occ.slots_needed - occ.seats,
    minTrust: occ.min_trust,
    level: isEnabled("F8") ? trustLevel(i.user.id_status, facts, i.now) : "new",
    pausedUntil: pausedUntil(facts, i.now),
    alreadyBooked: (await activeBookingFor(i.user.id, i.occurrenceId)) !== null,
    startAt: occ.start_at,
    now: i.now,
    enforceTrust,
  });
  if (!check.ok) return check;

  const approval = occ.booking_mode === "approval" && !i.skipApproval;
  const status: BookingStatus = approval ? "requested" : initialBookingStatus(occ.start_at, i.now);
  let id: string;
  try {
    const [row] = await query<{ id: string }>(
      `insert into bookings (occurrence_id, user_id, status, source, confirm_token, confirmed_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [i.occurrenceId, i.user.id, status, i.source, newToken(), status === "confirmed" ? i.now : null, i.now],
    );
    id = row.id;
  } catch {
    // The unique index caught a double submit.
    return { ok: false, reason: "already_booked" };
  }
  await query("update users set last_active_at = $2 where id = $1", [i.user.id, i.now]);

  const booking = (await getBooking(id))!;
  const m = messageTask(booking);
  if (approval) {
    await messageVolunteer(booking, "booking_requested", MSG.bookingRequested(m));
    await messageOrg(
      booking.org_id,
      "ngo_new_request",
      MSG.ngoNewRequest({ name: booking.user_name, task: booking.title, date: m.date, link: `${i.origin}/ngo/tasks/${booking.task_id}/applicants` }),
    );
  } else {
    const link = `${i.origin}/c/${booking.confirm_token}`;
    await messageVolunteer(
      booking,
      "booking_confirmed",
      MSG.bookingConfirmed({ ...m, deadline: fmtDateTime(freeReleaseDeadline(booking.start_at)), link }),
      { link },
    );
  }
  await track("booking_created", { booking_id: id, task_id: booking.task_id, source: i.source, status }, i.user.id);
  return { ok: true, booking };
}

/** "I'm coming". Allowed for any active booking before the slot starts. */
export async function confirmBooking(b: BookingView, now: Date): Promise<boolean> {
  if (now.getTime() >= b.start_at.getTime()) return false;
  const rows = await query(
    `update bookings set status = 'confirmed', confirmed_at = $2
     where id = $1 and status in ('booked','awaiting_confirmation') returning id`,
    [b.id, now],
  );
  if (rows.length > 0) await track("booking_confirmed", { booking_id: b.id, task_id: b.task_id }, b.user_id);
  return rows.length > 0 || b.status === "confirmed";
}

export type ReleaseResult =
  | { ok: true; type: "released_early" | "released_late" | "withdrawn" }
  | { ok: false };

/**
 * One-tap release (§5.3). Early before T−24h, late after. The seat reopens at once
 * because seat counts are derived from booking statuses.
 */
export async function releaseBooking(
  b: BookingView,
  reason: ReleaseReason | null,
  now: Date,
): Promise<ReleaseResult> {
  // Withdrawing a request that the NGO has not answered carries no record.
  const type = b.status === "requested" ? "released_early" : releaseType(b.start_at, now);
  if (!type) return { ok: false };
  const rows = await query(
    `update bookings set status = $2, released_at = $3, release_reason = $4
     where id = $1 and status in ('requested','booked','awaiting_confirmation','confirmed') returning id`,
    [b.id, type, now, reason],
  );
  if (rows.length === 0) return { ok: false };

  await messageVolunteer(
    b,
    "release_receipt",
    type === "released_early" ? MSG.releaseReceipt({ ngo: b.org_name }) : MSG.lateReleaseReceipt({ ngo: b.org_name }),
  );
  if (b.status !== "requested") {
    const t = await occurrenceTurnout(b.occurrence_id, b.slots_needed);
    await messageOrg(
      b.org_id,
      "ngo_release_alert",
      MSG.ngoReleaseAlert({ name: b.user_name, task: b.title, date: fmtDate(b.start_at), confirmed: t.confirmed, needed: t.needed }),
      undefined,
      `ngo_release_alert:${b.id}`,
    );
  }
  await track("booking_released", { booking_id: b.id, task_id: b.task_id, type, reason, hours_before: (b.start_at.getTime() - now.getTime()) / 36e5 }, b.user_id);
  return { ok: true, type: b.status === "requested" ? "withdrawn" : type };
}

export async function occurrenceTurnout(occurrenceId: string, needed: number) {
  const rows = await query<{ status: BookingStatus; source: string }>(
    "select status, source from bookings where occurrence_id = $1",
    [occurrenceId],
  );
  return turnout(needed, rows);
}

export const isActive = (s: BookingStatus) => ACTIVE_STATUSES.includes(s);

/** Place or link line for the day-of reminder. */
export function placeOrLink(b: BookingView): string {
  if (b.mode === "online") return b.online_link ?? "Online";
  return `${[b.address, b.city].filter(Boolean).join(", ")} (${mapLink(b.lat, b.lng, b.address)})`;
}

export const contactLine = (b: BookingView) => `${b.contact_name}, ${fmtPhone(b.contact_phone)}`;
