import "server-only";
import { query, queryOne } from "@/lib/db";

// Data behind the MVP1 admin queues (§6.3): reminders sent by hand over WhatsApp,
// and released seats the team refills from a manual standby list.

export interface QueuedReminder {
  id: string;
  type: string;
  status: "manual_pending" | "manual_sent";
  due_at: Date;
  sent_at: Date | null;
  payload: { to: string | null; text: string; link: string | null; name?: string; task?: string; booking_id?: string };
  booking_status: string | null;
}

export async function listReminders(): Promise<QueuedReminder[]> {
  return query<QueuedReminder>(
    `select n.id, n.type, n.status, n.due_at, n.sent_at, n.payload, b.status as booking_status
     from notifications n
     left join bookings b on b.id::text = n.payload->>'booking_id'
     where n.channel = 'whatsapp' and n.status in ('manual_pending','manual_sent')
     order by (n.status = 'manual_pending') desc, n.due_at`,
  );
}

export async function markReminderSent(id: string): Promise<void> {
  await query("update notifications set status = 'manual_sent', sent_at = now() where id = $1 and status = 'manual_pending'", [id]);
}

export interface ReleasedSeatRow {
  occurrence_id: string;
  task_id: string;
  title: string;
  org_name: string;
  share_slug: string;
  start_at: Date;
  slots_needed: number;
  seats_taken: number;
  releases: number;
  fills: number;
  last_released_at: Date;
  released_by: string[];
}

/** Upcoming occurrences with a released seat that is still open. */
export async function listReleasedSeats(now: Date): Promise<ReleasedSeatRow[]> {
  return query<ReleasedSeatRow>(
    `select oc.id as occurrence_id, t.id as task_id, t.title, o.name as org_name, t.share_slug, oc.start_at, t.slots_needed,
            count(*) filter (where b.status in ('booked','awaiting_confirmation','confirmed'))::int as seats_taken,
            count(*) filter (where b.status in ('released_early','released_late'))::int as releases,
            count(*) filter (where b.source in ('admin','standby'))::int as fills,
            max(b.released_at) as last_released_at,
            coalesce(array_agg(u.name) filter (where b.status in ('released_early','released_late')), '{}') as released_by
     from task_occurrences oc
     join tasks t on t.id = oc.task_id
     join organisations o on o.id = t.org_id
     join bookings b on b.occurrence_id = oc.id
     join users u on u.id = b.user_id
     where oc.start_at > $1
     group by oc.id, t.id, o.name
     having count(*) filter (where b.status in ('released_early','released_late')) > 0
     order by oc.start_at`,
    [now],
  );
}

// --- Manual standby list: names and phones entered by the team ---

export interface StandbyPerson {
  name: string;
  phone: string;
}

const KEY = "manual_standby";

export async function manualStandby(): Promise<StandbyPerson[]> {
  const row = await queryOne<{ value: StandbyPerson[] }>("select value from app_state where key = $1", [KEY]);
  return row?.value ?? [];
}

export async function saveManualStandby(list: StandbyPerson[]): Promise<void> {
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [KEY, JSON.stringify(list)],
  );
}
