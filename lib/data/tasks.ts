import "server-only";
import { query, queryOne } from "@/lib/db";
import { slugify } from "@/lib/format";
import { DAY_MS } from "@/lib/rules";
import { suffix } from "./orgs";

// Activities. (The table is called `tasks`; one row in `task_occurrences` per date.)

export interface Activity {
  id: string;
  org_id: string;
  title: string;
  cause: string;
  /** What volunteers will do. */
  role: string;
  /** "You're done when…" */
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
  /** How many dates (1 for a one-off, n for "weekly × n"). */
  occurrences: number;
  slots_needed: number;
  contact_name: string;
  contact_phone: string;
  share_slug: string;
  created_at: Date;
}

export interface ActivityWithOrg extends Activity {
  org_name: string;
  org_slug: string;
  org_status: string;
  org_checked: boolean;
}

/** One date of an activity. */
export interface ActivityDate {
  id: string;
  task_id: string;
  start_at: Date;
  end_at: Date;
  /** Spots already held. */
  taken: number;
}

export interface NewActivity {
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
  /** Weekly × n. 1 = one-off. */
  times: number;
  slots_needed: number;
  contact_name: string;
  contact_phone: string;
}

export async function createActivity(a: NewActivity): Promise<Activity> {
  const times = Math.max(1, a.times);
  const [row] = await query<Activity>(
    `insert into tasks
       (org_id, title, cause, role, done_definition, mode, city, address, lat, lng, online_link, start_at, end_at,
        duration_min, commitment, recurrence_rule, occurrences, slots_needed, contact_name, contact_role, contact_phone,
        share_slug, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'',$20,$21,'published')
     returning *`,
    [
      a.org_id, a.title, a.cause, a.role, a.done_definition, a.mode, a.city, a.address, a.lat, a.lng, a.online_link,
      a.start_at, a.end_at, Math.round((a.end_at.getTime() - a.start_at.getTime()) / 60000),
      times > 1 ? "recurring" : "one_off", times > 1 ? "weekly" : null, times, a.slots_needed,
      a.contact_name, a.contact_phone, `${slugify(a.title)}-${suffix()}`,
    ],
  );
  for (let i = 0; i < times; i++) {
    await query("insert into task_occurrences (task_id, start_at, end_at) values ($1, $2, $3)", [
      row.id, new Date(a.start_at.getTime() + i * 7 * DAY_MS), new Date(a.end_at.getTime() + i * 7 * DAY_MS),
    ]);
  }
  return row;
}

const WITH_ORG = `
  select t.*, o.name as org_name, o.slug as org_slug, o.status as org_status, (o.verified_at is not null) as org_checked
  from tasks t join organisations o on o.id = t.org_id`;

export async function getActivityBySlug(slug: string): Promise<ActivityWithOrg | null> {
  return queryOne<ActivityWithOrg>(`${WITH_ORG} where t.share_slug = $1`, [slug]);
}

export async function getActivity(id: string): Promise<ActivityWithOrg | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<ActivityWithOrg>(`${WITH_ORG} where t.id = $1`, [id]);
}

const TAKEN = `(select count(*)::int from bookings b where b.occurrence_id = oc.id
  and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded'))`;

export async function listDates(activityId: string): Promise<ActivityDate[]> {
  return query<ActivityDate>(`select oc.*, ${TAKEN} as taken from task_occurrences oc where oc.task_id = $1 order by oc.start_at`, [activityId]);
}

export async function getDate(id: string): Promise<ActivityDate | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<ActivityDate>(`select oc.*, ${TAKEN} as taken from task_occurrences oc where oc.id = $1`, [id]);
}

/** One row per activity for Explore and NGO pages: its next upcoming date. */
export interface Upcoming extends ActivityWithOrg {
  date_id: string;
  date_start: Date;
  date_end: Date;
  taken: number;
}

/** Upcoming activities from approved NGOs only. */
export async function listUpcoming(now: Date, orgId?: string): Promise<Upcoming[]> {
  return query<Upcoming>(
    `select distinct on (t.id) t.*, o.name as org_name, o.slug as org_slug, o.status as org_status,
            (o.verified_at is not null) as org_checked,
            oc.id as date_id, oc.start_at as date_start, oc.end_at as date_end, ${TAKEN} as taken
     from tasks t
     join organisations o on o.id = t.org_id and o.status = 'approved'
     join task_occurrences oc on oc.task_id = t.id and oc.start_at > $1
     where t.status = 'published' and ($2::uuid is null or t.org_id = $2::uuid)
     order by t.id, oc.start_at`,
    [now, orgId ?? null],
  ).then((rows) => rows.sort((a, b) => a.date_start.getTime() - b.date_start.getTime()));
}

/** One date of one of an NGO's activities, with head-counts for the dashboard. */
export interface DashboardDate {
  date_id: string;
  activity_id: string;
  title: string;
  cause: string;
  start_at: Date;
  end_at: Date;
  slots_needed: number;
  coming: number;
  not_heard_back: number;
  cant_make_it: number;
  came: number;
  didnt_come: number;
  to_mark: number;
}

export async function listDashboard(orgId: string): Promise<DashboardDate[]> {
  return query<DashboardDate>(
    `select oc.id as date_id, t.id as activity_id, t.title, t.cause, oc.start_at, oc.end_at, t.slots_needed,
            count(b.id) filter (where b.status = 'confirmed')::int as coming,
            count(b.id) filter (where b.status in ('booked','awaiting_confirmation'))::int as not_heard_back,
            count(b.id) filter (where b.status in ('released_early','released_late'))::int as cant_make_it,
            count(b.id) filter (where b.status = 'attended')::int as came,
            count(b.id) filter (where b.status = 'no_show')::int as didnt_come,
            count(b.id) filter (where b.status in ('booked','awaiting_confirmation','confirmed'))::int as to_mark
     from task_occurrences oc
     join tasks t on t.id = oc.task_id
     left join bookings b on b.occurrence_id = oc.id
     where t.org_id = $1
     group by oc.id, t.id
     order by oc.start_at`,
    [orgId],
  );
}
