import "server-only";
import type { User } from "@/lib/auth";
import { applyFilters, listFeed, parseFilters, type FeedItem } from "@/lib/data/feed";
import { query, queryOne } from "@/lib/db";
import { istDateKey } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { notify } from "@/lib/notify";
import { DAY_MS, isLapsed, nudgeTasks, RULES } from "@/lib/rules";

// Re-engagement nudges (F12, §5.9). Trigger: no booking for 30 days, or a change of city.

export interface Nudge {
  reason: "lapsed" | "moved";
  tasks: FeedItem[];
  causes: string[];
  text: string;
  seeAllHref: string;
}

const movedKey = (userId: string) => `nudge_moved:${userId}`;
const snoozeKey = (userId: string) => `nudge_snoozed:${userId}`;

export async function markMoved(userId: string, now: Date): Promise<void> {
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`,
    [movedKey(userId), JSON.stringify(now.getTime())],
  );
  await query("delete from app_state where key = $1", [snoozeKey(userId)]);
}

/** Dismiss hides the card for a week; "Not now" hides it for a day. */
export async function snoozeNudge(userId: string, now: Date, days: number): Promise<void> {
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`,
    [snoozeKey(userId), JSON.stringify(now.getTime() + days * DAY_MS)],
  );
  await query("delete from app_state where key = $1", [movedKey(userId)]);
}

export async function nudgeFor(user: User, now: Date): Promise<Nudge | null> {
  const snoozed = await queryOne<{ value: number }>("select value from app_state where key = $1", [snoozeKey(user.id)]);
  if (snoozed && snoozed.value > now.getTime()) return null;

  const [last, moved] = await Promise.all([
    queryOne<{ at: Date | null; upcoming: number }>(
      `select max(b.created_at) as at,
              count(*) filter (where b.status in ('requested','booked','awaiting_confirmation','confirmed') and oc.start_at > $2)::int as upcoming
       from bookings b join task_occurrences oc on oc.id = b.occurrence_id where b.user_id = $1`,
      [user.id, now],
    ),
    queryOne<{ value: number }>("select value from app_state where key = $1", [movedKey(user.id)]),
  ]);
  if ((last?.upcoming ?? 0) > 0) return null;
  // Someone who joined recently and has not booked yet is not "lapsed".
  const lapsed = isLapsed(last?.at ?? user.created_at, now);
  if (!lapsed && !moved) return null;

  const attended = await query<{ org_id: string }>(
    `select distinct t.org_id from bookings b
     join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
     where b.user_id = $1 and b.status = 'attended'`,
    [user.id],
  );
  const city = user.city ?? "Delhi NCR";
  // Everything bookable in the volunteer's city or online, with seats left.
  const pool = applyFilters(await listFeed(now), parseFilters({ city }, city), now).filter(
    (t) => t.seats_taken < t.slots_needed,
  );
  const picked = nudgeTasks(
    pool.map((t) => ({ ...t, id: t.task_id, orgId: t.org_id, startAt: t.start_at })),
    { city, savedCauses: user.saved_causes, attendedOrgIds: attended.map((a) => a.org_id) },
    now,
  );
  if (picked.length === 0) return null;

  const causes = user.saved_causes.length > 0 ? user.saved_causes : [...new Set(picked.map((t) => t.cause))];
  const text = MSG.nudge({ n: picked.length, causes: causes.join(" and ") });
  // The same nudge also goes out as a message (shown in the Message preview), once a week.
  await notify({
    type: "nudge", channel: "whatsapp", userId: user.id, to: user.phone, text,
    dedupeKey: `nudge:${user.id}:${istDateKey(new Date(Math.floor(now.getTime() / (7 * DAY_MS)) * 7 * DAY_MS))}`,
  });
  return {
    reason: moved ? "moved" : "lapsed",
    tasks: picked.slice(0, RULES.nudgeMaxTasks),
    causes,
    text,
    seeAllHref: `/feed?city=${encodeURIComponent(city)}${user.saved_causes.length ? `&cause=${encodeURIComponent(user.saved_causes.join(","))}` : ""}`,
  };
}
