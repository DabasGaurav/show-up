import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@/lib/auth";
import { REASON_PHRASE, type Reason } from "@/lib/constants";
import { query, queryOne } from "@/lib/db";
import { track } from "@/lib/events";
import { fmtDayDate, fmtTime, fmtWeekday } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { sendEmail } from "@/lib/notify";
import { checkInAt, freeType, statusOnSave, whoIsComing, type BookingStatus, type SpotFact } from "@/lib/rules";

// Spots: one person's place on one date of an activity. (The table is called `bookings`.)

export interface Spot {
  id: string;
  user_id: string;
  occurrence_id: string;
  status: BookingStatus;
  confirm_token: string;
  confirmed_at: Date | null;
  released_at: Date | null;
  release_reason: Reason | null;
  created_at: Date;
  start_at: Date;
  end_at: Date;
  activity_id: string;
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
  contact_name: string;
  contact_phone: string;
  share_slug: string;
  org_id: string;
  org_name: string;
  org_checked: boolean;
  user_name: string;
  user_phone: string | null;
  user_email: string | null;
}

const SPOT = `
  select b.*, oc.start_at, oc.end_at,
         t.id as activity_id, t.title, t.cause, t.role, t.done_definition, t.mode, t.city, t.address, t.lat, t.lng,
         t.online_link, t.duration_min, t.slots_needed, t.contact_name, t.contact_phone, t.share_slug,
         o.id as org_id, o.name as org_name, (o.verified_at is not null) as org_checked,
         u.name as user_name, u.phone as user_phone, u.email as user_email
  from bookings b
  join task_occurrences oc on oc.id = b.occurrence_id
  join tasks t on t.id = oc.task_id
  join organisations o on o.id = t.org_id
  join users u on u.id = b.user_id`;

export async function getSpot(id: string): Promise<Spot | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<Spot>(`${SPOT} where b.id = $1`, [id]);
}

export async function getSpotByToken(token: string): Promise<Spot | null> {
  return queryOne<Spot>(`${SPOT} where b.confirm_token = $1`, [token]);
}

export async function listSpotsForUser(userId: string): Promise<Spot[]> {
  return query<Spot>(`${SPOT} where b.user_id = $1 order by oc.start_at`, [userId]);
}

export async function listSpotsForDate(dateId: string): Promise<Spot[]> {
  return query<Spot>(`${SPOT} where b.occurrence_id = $1 order by b.created_at`, [dateId]);
}

/** The person's live spot on this date, if they have one. */
export async function mySpot(userId: string, dateId: string): Promise<Spot | null> {
  return queryOne<Spot>(
    `${SPOT} where b.user_id = $1 and b.occurrence_id = $2
       and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')`,
    [userId, dateId],
  );
}

/** Track-record facts for many people at once. */
export async function factsFor(userIds: string[]): Promise<Map<string, SpotFact[]>> {
  const out = new Map<string, SpotFact[]>(userIds.map((id) => [id, []]));
  if (userIds.length === 0) return out;
  const rows = await query<{ user_id: string; status: BookingStatus; start_at: Date }>(
    `select b.user_id, b.status, oc.start_at from bookings b join task_occurrences oc on oc.id = b.occurrence_id
     where b.user_id = any($1::uuid[])`,
    [userIds],
  );
  for (const r of rows) out.get(r.user_id)?.push({ status: r.status, startAt: r.start_at });
  return out;
}

const msg = (s: Pick<Spot, "title" | "org_name" | "start_at">) => ({
  title: s.title, ngo: s.org_name, day: fmtWeekday(s.start_at), time: fmtTime(s.start_at),
});

export type SaveResult = { ok: true; spot: Spot } | { ok: false; reason: "full" | "already" | "started" };

/** Save a spot: allowed if spots are left; one spot per person per activity date. */
export async function saveSpot(user: User, dateId: string, now: Date, origin: string): Promise<SaveResult> {
  const d = await queryOne<{ start_at: Date; slots_needed: number; taken: number; city: string; mode: string }>(
    `select oc.start_at, t.slots_needed, t.city, t.mode,
            (select count(*)::int from bookings b where b.occurrence_id = oc.id
               and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')) as taken
     from task_occurrences oc join tasks t on t.id = oc.task_id
     join organisations o on o.id = t.org_id and o.status = 'approved'
     where oc.id = $1`,
    [dateId],
  );
  if (!d || now.getTime() >= d.start_at.getTime()) return { ok: false, reason: "started" };
  if (await mySpot(user.id, dateId)) return { ok: false, reason: "already" };
  if (d.taken >= d.slots_needed) return { ok: false, reason: "full" };

  const status = statusOnSave(d.start_at, now);
  let id: string;
  try {
    const [row] = await query<{ id: string }>(
      `insert into bookings (occurrence_id, user_id, status, source, confirm_token, confirmed_at, created_at)
       values ($1, $2, $3, 'link', $4, $5, $6) returning id`,
      [dateId, user.id, status, randomBytes(18).toString("base64url"), status === "confirmed" ? now : null, now],
    );
    id = row.id;
  } catch {
    return { ok: false, reason: "already" }; // a double tap
  }
  // Remember where they volunteer, for the "come back" email.
  await query("update users set last_active_at = $2, city = case when $3 = 'onsite' then $4 else coalesce(city, $4) end where id = $1", [
    user.id, now, d.mode, d.city,
  ]);

  const spot = (await getSpot(id))!;
  await sendEmail({
    type: "spot_saved", to: spot.user_email, userId: user.id, about: spot.title, key: `spot_saved:${id}`,
    text: MSG.spotSaved({
      ...msg(spot),
      day: fmtDayDate(spot.start_at),
      checkInDay: status === "booked" ? fmtDayDate(checkInAt(spot.start_at)) : null,
      link: `${origin}/c/${spot.confirm_token}`,
    }),
  });
  await track("spot_saved", { spot: id, activity: spot.activity_id }, user.id);
  return { ok: true, spot };
}

/** "Yes, I'll be there." */
export async function sayYes(s: Spot, now: Date): Promise<boolean> {
  if (now.getTime() >= s.start_at.getTime()) return false;
  const rows = await query(
    "update bookings set status = 'confirmed', confirmed_at = $2 where id = $1 and status in ('booked','awaiting_confirmation') returning id",
    [s.id, now],
  );
  if (rows.length > 0) await track("said_yes", { spot: s.id }, s.user_id);
  return rows.length > 0 || s.status === "confirmed";
}

/**
 * "I can't make it." At least a day before: nothing goes on the record. Later:
 * "freed late". Either way the spot reopens at once and the NGO gets an email.
 */
export async function freeSpot(s: Spot, reason: Reason | null, now: Date): Promise<"released_early" | "released_late" | null> {
  const type = freeType(s.start_at, now);
  if (!type) return null;
  const rows = await query(
    `update bookings set status = $2, released_at = $3, release_reason = $4
     where id = $1 and status in ('booked','awaiting_confirmation','confirmed') returning id`,
    [s.id, type, now, reason],
  );
  if (rows.length === 0) return null;

  await sendEmail({
    type: "freed_volunteer", to: s.user_email, userId: s.user_id, about: s.title, key: `freed_volunteer:${s.id}`,
    text: MSG.freedToVolunteer({ ngo: s.org_name }),
  });
  const statuses = await query<{ status: BookingStatus }>("select status from bookings where occurrence_id = $1", [s.occurrence_id]);
  const who = whoIsComing(s.slots_needed, statuses.map((r) => r.status));
  const text = MSG.freedToNgo({
    name: s.user_name.split(" ")[0], title: s.title, reason: reason ? REASON_PHRASE[reason] : null, coming: who.coming, needed: who.needed,
  });
  for (const m of await orgEmails(s.org_id)) {
    await sendEmail({ type: "freed_ngo", to: m.email, userId: m.id, about: s.title, key: `freed_ngo:${s.id}:${m.id}`, text });
  }
  await track("spot_freed", { spot: s.id, type, reason }, s.user_id);
  return type;
}

export async function orgEmails(orgId: string): Promise<{ id: string; email: string | null }[]> {
  return query("select u.id, u.email from org_members m join users u on u.id = m.user_id where m.org_id = $1", [orgId]);
}

/** Mark who came. Marks can be corrected while the window is open. */
export async function markWhoCame(dateId: string, marks: Record<string, "attended" | "no_show">): Promise<number> {
  let changed = 0;
  for (const [spotId, status] of Object.entries(marks)) {
    const rows = await query(
      `update bookings set status = $3
       where id = $1 and occurrence_id = $2 and status in ('booked','awaiting_confirmation','confirmed','attended','no_show') and status <> $3
       returning id`,
      [spotId, dateId, status],
    );
    changed += rows.length;
  }
  return changed;
}

/** The one number on the admin page, and the rows behind the CSV export. */
export async function pastStatuses(now: Date): Promise<BookingStatus[]> {
  const rows = await query<{ status: BookingStatus }>(
    "select b.status from bookings b join task_occurrences oc on oc.id = b.occurrence_id where oc.start_at <= $1",
    [now],
  );
  return rows.map((r) => r.status);
}
