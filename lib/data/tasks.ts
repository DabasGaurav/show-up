import "server-only";
import { query, queryOne } from "@/lib/db";
import { RECURRENCE, type RecurrenceRule } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { DAY_MS, type MinTrust } from "@/lib/rules";
import { suffix } from "./orgs";

export interface Task {
  id: string;
  org_id: string;
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
  start_at: Date;
  end_at: Date;
  duration_min: number;
  commitment: "one_off" | "recurring";
  recurrence_rule: string | null;
  occurrences: number;
  slots_needed: number;
  min_trust: MinTrust;
  booking_mode: "instant" | "approval";
  contact_name: string;
  contact_role: string;
  contact_phone: string;
  share_slug: string;
  status: "draft" | "published" | "closed";
  created_at: Date;
}

export interface TaskWithOrg extends Task {
  org_name: string;
  org_slug: string;
  org_verified_at: Date | null;
  org_status: string;
}

export interface Occurrence {
  id: string;
  task_id: string;
  start_at: Date;
  end_at: Date;
  /** Bookings holding a seat. */
  seats_taken: number;
}

export type NewTask = Omit<Task, "id" | "share_slug" | "status" | "created_at" | "duration_min" | "end_at"> & {
  end_at: Date;
};

/** Start/end of every occurrence of a task (one row per date for recurring tasks). */
export function occurrenceDates(
  start: Date,
  end: Date,
  commitment: Task["commitment"],
  rule: string | null,
  count: number,
): { start: Date; end: Date }[] {
  const step = commitment === "recurring" && rule && rule in RECURRENCE ? RECURRENCE[rule as RecurrenceRule].days : 0;
  const n = step === 0 ? 1 : Math.max(1, count);
  return Array.from({ length: n }, (_, i) => ({
    start: new Date(start.getTime() + i * step * DAY_MS),
    end: new Date(end.getTime() + i * step * DAY_MS),
  }));
}

export async function createTask(t: NewTask, status: Task["status"] = "published"): Promise<Task> {
  const duration = Math.round((t.end_at.getTime() - t.start_at.getTime()) / 60000);
  const dates = occurrenceDates(t.start_at, t.end_at, t.commitment, t.recurrence_rule, t.occurrences);
  const [task] = await query<Task>(
    `insert into tasks
       (org_id, title, cause, role, done_definition, mode, city, address, lat, lng, online_link,
        start_at, end_at, duration_min, commitment, recurrence_rule, occurrences, slots_needed,
        min_trust, booking_mode, contact_name, contact_role, contact_phone, share_slug, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
     returning *`,
    [
      t.org_id, t.title, t.cause, t.role, t.done_definition, t.mode, t.city, t.address, t.lat, t.lng,
      t.online_link, t.start_at, t.end_at, duration, t.commitment,
      t.commitment === "recurring" ? t.recurrence_rule : null, dates.length, t.slots_needed,
      t.min_trust, t.booking_mode, t.contact_name, t.contact_role, t.contact_phone,
      `${slugify(t.title)}-${suffix(2)}`, status,
    ],
  );
  for (const d of dates) {
    await query("insert into task_occurrences (task_id, start_at, end_at) values ($1, $2, $3)", [
      task.id, d.start, d.end,
    ]);
  }
  return task;
}

const WITH_ORG = `
  select t.*, o.name as org_name, o.slug as org_slug, o.verified_at as org_verified_at, o.status as org_status
  from tasks t join organisations o on o.id = t.org_id`;

export async function getTaskBySlug(slug: string): Promise<TaskWithOrg | null> {
  return queryOne<TaskWithOrg>(`${WITH_ORG} where t.share_slug = $1`, [slug]);
}

export async function getTask(id: string): Promise<TaskWithOrg | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<TaskWithOrg>(`${WITH_ORG} where t.id = $1`, [id]);
}

const SEATS = `(select count(*)::int from bookings b where b.occurrence_id = oc.id
  and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded'))`;

export async function listOccurrences(taskId: string): Promise<Occurrence[]> {
  return query<Occurrence>(
    `select oc.*, ${SEATS} as seats_taken from task_occurrences oc where oc.task_id = $1 order by oc.start_at`,
    [taskId],
  );
}

export async function getOccurrence(id: string): Promise<Occurrence | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<Occurrence>(
    `select oc.*, ${SEATS} as seats_taken from task_occurrences oc where oc.id = $1`,
    [id],
  );
}

export interface OrgTaskRow extends Task {
  next_start: Date | null;
  last_start: Date;
  seats_taken: number;
  seats_total: number;
}

/** NGO dashboard list: every task with its next occurrence and overall fill. */
export async function listTasksForOrg(orgId: string, now: Date): Promise<OrgTaskRow[]> {
  return query<OrgTaskRow>(
    `select t.*,
            (select min(oc.start_at) from task_occurrences oc where oc.task_id = t.id and oc.end_at >= $2) as next_start,
            (select max(oc.start_at) from task_occurrences oc where oc.task_id = t.id) as last_start,
            (select count(*)::int from bookings b join task_occurrences oc on oc.id = b.occurrence_id
              where oc.task_id = t.id
                and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')) as seats_taken,
            t.slots_needed * t.occurrences as seats_total
     from tasks t
     where t.org_id = $1
     order by t.start_at`,
    [orgId, now],
  );
}

/** One date of an activity with the head-counts the NGO dashboard shows. */
export interface OrgSession {
  occurrence_id: string;
  task_id: string;
  title: string;
  cause: string;
  start_at: Date;
  end_at: Date;
  slots_needed: number;
  coming: number;
  saved: number;
  waiting: number;
  freed: number;
  came: number;
  missed: number;
  unmarked: number;
}

export async function listOrgSessions(orgId: string): Promise<OrgSession[]> {
  return query<OrgSession>(
    `select oc.id as occurrence_id, t.id as task_id, t.title, t.cause, oc.start_at, oc.end_at, t.slots_needed,
            count(b.id) filter (where b.status = 'confirmed')::int as coming,
            count(b.id) filter (where b.status = 'booked')::int as saved,
            count(b.id) filter (where b.status = 'awaiting_confirmation')::int as waiting,
            count(b.id) filter (where b.status in ('released_early','released_late'))::int as freed,
            count(b.id) filter (where b.status = 'attended')::int as came,
            count(b.id) filter (where b.status = 'no_show')::int as missed,
            count(b.id) filter (where b.status in ('booked','awaiting_confirmation','confirmed'))::int as unmarked
     from task_occurrences oc
     join tasks t on t.id = oc.task_id
     left join bookings b on b.occurrence_id = oc.id
     where t.org_id = $1
     group by oc.id, t.id
     order by oc.start_at`,
    [orgId],
  );
}
