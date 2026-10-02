import "server-only";
import type { User } from "@/lib/auth";
import { createBooking, messageTask, occurrenceTurnout, type BookingView } from "@/lib/data/bookings";
import { volunteerProfiles } from "@/lib/data/volunteers";
import { query, queryOne } from "@/lib/db";
import { track } from "@/lib/events";
import { istDateKey } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { notify } from "@/lib/notify";
import { offerExpiry, standbyQueue, type StandbyCandidate } from "@/lib/rules";

// Standby cover (F11, §5.7): a released seat is offered to matching standby
// volunteers, Trusted first. The first to accept gets it.

export interface StandbyRow {
  id: string;
  user_id: string;
  date: string;
  city: string | null;
  is_online: boolean;
  causes: string[];
  active: boolean;
}

export async function listStandby(userId: string, fromDate: string): Promise<StandbyRow[]> {
  return query<StandbyRow>(
    "select id, user_id, date::text as date, city, is_online, causes, active from standby where user_id = $1 and date >= $2::date and active order by date",
    [userId, fromDate],
  );
}

/** "Free at short notice" for one date. One row per volunteer per date. */
export async function setStandby(
  userId: string,
  s: { date: string; city: string | null; isOnline: boolean; causes: string[] },
): Promise<void> {
  await query("delete from standby where user_id = $1 and date = $2::date", [userId, s.date]);
  await query(
    "insert into standby (user_id, date, city, is_online, causes, active) values ($1, $2::date, $3, $4, $5, true)",
    [userId, s.date, s.city, s.isOnline, s.causes],
  );
}

export async function clearStandby(userId: string, id: string): Promise<void> {
  await query("delete from standby where id = $1 and user_id = $2", [id, userId]);
}

/** Offers a released seat to every matching standby volunteer. Returns how many offers went out. */
export async function offerToStandby(released: BookingView, now: Date, origin: string): Promise<number> {
  if (released.start_at.getTime() <= now.getTime()) return 0;
  const rows = await query<StandbyRow & { busy: boolean }>(
    `select s.id, s.user_id, s.date::text as date, s.city, s.is_online, s.causes, s.active,
            exists (
              select 1 from bookings b join task_occurrences oc on oc.id = b.occurrence_id
              where b.user_id = s.user_id and b.status in ('requested','booked','awaiting_confirmation','confirmed')
                and oc.start_at < $3 and oc.end_at > $2
            ) as busy
     from standby s
     where s.active and s.date = $1::date and s.user_id <> $4
       and not exists (select 1 from standby_offers o where o.booking_released_id = $5 and o.user_id = s.user_id)`,
    [istDateKey(released.start_at), released.start_at, released.end_at, released.user_id, released.id],
  );
  if (rows.length === 0) return 0;

  const profiles = await volunteerProfiles(rows.map((r) => r.user_id), now);
  const candidates: StandbyCandidate[] = rows.map((r) => ({
    userId: r.user_id,
    level: profiles.get(r.user_id)?.level ?? "new",
    city: r.city,
    isOnline: r.is_online,
    causes: r.causes,
    busy: r.busy,
  }));
  const queue = standbyQueue(
    { mode: released.mode, city: released.city, cause: released.cause, minTrust: released.min_trust },
    candidates,
  );
  const expires = offerExpiry(now, released.start_at);
  for (const [rank, c] of queue.entries()) {
    const [offer] = await query<{ id: string }>(
      `insert into standby_offers (booking_released_id, occurrence_id, user_id, sent_at, expires_at, status)
       values ($1, $2, $3, $4, $5, 'sent') returning id`,
      // Trusted volunteers are messaged first; the order is kept in the log.
      [released.id, released.occurrence_id, c.userId, new Date(now.getTime() + rank * 1000), expires],
    );
    const p = profiles.get(c.userId);
    const link = `${origin}/standby/${offer.id}`;
    await notify({
      type: "standby_offer", channel: "whatsapp", userId: c.userId, to: p?.phone, link,
      text: MSG.standbyOffer({ ...messageTask(released), link }),
    });
  }
  return queue.length;
}

export interface OfferView {
  id: string;
  user_id: string;
  occurrence_id: string;
  booking_released_id: string;
  sent_at: Date;
  expires_at: Date;
  status: "sent" | "accepted" | "declined" | "expired" | "taken";
  title: string;
  cause: string;
  org_name: string;
  share_slug: string;
  mode: "onsite" | "online";
  city: string;
  address: string | null;
  start_at: Date;
  end_at: Date;
  slots_needed: number;
  user_name: string;
}

const OFFER = `
  select so.*, t.title, t.cause, o.name as org_name, t.share_slug, t.mode, t.city, t.address,
         oc.start_at, oc.end_at, t.slots_needed, u.name as user_name
  from standby_offers so
  join task_occurrences oc on oc.id = so.occurrence_id
  join tasks t on t.id = oc.task_id
  join organisations o on o.id = t.org_id
  join users u on u.id = so.user_id`;

export async function getOffer(id: string): Promise<OfferView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<OfferView>(`${OFFER} where so.id = $1`, [id]);
}

/** Offers a volunteer can still act on, plus ones that were just taken (so they see why). */
export async function listOffersForUser(userId: string, now: Date): Promise<OfferView[]> {
  return query<OfferView>(
    `${OFFER} where so.user_id = $1 and oc.start_at > $2
       and (so.status = 'sent' or (so.status = 'taken' and so.sent_at > $3))
     order by so.sent_at desc`,
    [userId, now, new Date(now.getTime() - 24 * 36e5)],
  );
}

export async function listOffersForOccurrence(occurrenceId: string): Promise<(OfferView & { released_by: string; released_at: Date | null })[]> {
  return query(
    `select x.*, ru.name as released_by, rb.released_at from (${OFFER} where so.occurrence_id = $1) x
     join bookings rb on rb.id = x.booking_released_id
     join users ru on ru.id = rb.user_id
     order by rb.released_at, x.sent_at`,
    [occurrenceId],
  );
}

export type AcceptResult = { ok: true; bookingId: string } | { ok: false; reason: "taken" | "expired" | "closed" };

/** First to accept gets the seat; every other offer for it becomes "taken". */
export async function acceptOffer(offer: OfferView, user: User, now: Date, origin: string): Promise<AcceptResult> {
  if (offer.status === "taken" || offer.status === "accepted") return { ok: false, reason: "taken" };
  if (offer.status !== "sent") return { ok: false, reason: "closed" };
  if (now.getTime() >= offer.expires_at.getTime()) {
    await query("update standby_offers set status = 'expired' where id = $1 and status = 'sent'", [offer.id]);
    return { ok: false, reason: "expired" };
  }
  // Claim the offer first so two taps cannot both win.
  const claimed = await query(
    `update standby_offers set status = 'accepted'
     where id = $1 and status = 'sent'
       and not exists (select 1 from standby_offers o2 where o2.booking_released_id = $2 and o2.status = 'accepted')
     returning id`,
    [offer.id, offer.booking_released_id],
  );
  if (claimed.length === 0) return { ok: false, reason: "taken" };

  const t = await occurrenceTurnout(offer.occurrence_id, offer.slots_needed);
  const res = t.seatsLeft > 0
    ? await createBooking({ user, occurrenceId: offer.occurrence_id, source: "standby", now, origin, skipApproval: true })
    : ({ ok: false } as const);
  if (!res.ok) {
    // Someone booked the reopened seat from the task page first.
    await query("update standby_offers set status = 'taken' where booking_released_id = $1 and status in ('sent','accepted')", [offer.booking_released_id]);
    return { ok: false, reason: "taken" };
  }
  await query("update standby_offers set status = 'taken' where booking_released_id = $1 and status = 'sent'", [offer.booking_released_id]);
  await track("standby_offer_accepted", { offer_id: offer.id, occurrence_id: offer.occurrence_id, booking_id: res.booking.id }, user.id);
  return { ok: true, bookingId: res.booking.id };
}

export async function declineOffer(offer: OfferView): Promise<void> {
  await query("update standby_offers set status = 'declined' where id = $1 and status = 'sent'", [offer.id]);
}
