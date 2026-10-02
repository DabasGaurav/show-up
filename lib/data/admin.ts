import "server-only";
import { query, queryOne } from "@/lib/db";
import type { BookingStatus } from "@/lib/rules";

// What the team's admin page reads and changes. Callers check isAdmin() first.

export interface AdminActivity {
  id: string; title: string; cause: string; city: string; mode: string; share_slug: string; status: string;
  org_id: string; org_name: string; owner_id: string | null; dates: number; next_at: Date | null; first_at: Date; spots: number;
}

export async function listAllActivities(): Promise<AdminActivity[]> {
  return query<AdminActivity>(
    `select t.id, t.title, t.cause, t.city, t.mode, t.share_slug, t.status, o.id as org_id, o.name as org_name,
            (select m.user_id from org_members m where m.org_id = o.id order by (m.role = 'owner') desc limit 1) as owner_id,
            (select count(*)::int from task_occurrences oc where oc.task_id = t.id) as dates,
            (select min(oc.start_at) from task_occurrences oc where oc.task_id = t.id and oc.start_at > now()) as next_at,
            t.start_at as first_at,
            (select count(*)::int from bookings b join task_occurrences oc on oc.id = b.occurrence_id where oc.task_id = t.id) as spots
     from tasks t join organisations o on o.id = t.org_id
     order by coalesce((select min(oc.start_at) from task_occurrences oc where oc.task_id = t.id and oc.start_at > now()), t.start_at) desc`,
  );
}

export interface AdminSpot {
  id: string; status: BookingStatus; release_reason: string | null; start_at: Date; title: string; org_name: string;
  user_id: string; user_name: string; user_email: string | null; is_seed: boolean;
}

export async function listAllSpots(limit = 300): Promise<AdminSpot[]> {
  return query<AdminSpot>(
    `select b.id, b.status, b.release_reason, b.is_seed, oc.start_at, t.title, o.name as org_name, u.id as user_id, u.name as user_name, u.email as user_email
     from bookings b join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
     join organisations o on o.id = t.org_id join users u on u.id = b.user_id
     order by oc.start_at desc, b.created_at limit $1`,
    [limit],
  );
}

export interface AdminPerson { id: string; name: string; email: string | null; city: string | null; is_seed: boolean; spots: number; created_at: Date }

/** Everyone who is not an NGO's coordinator. */
export async function listVolunteers(): Promise<AdminPerson[]> {
  return query<AdminPerson>(
    `select u.id, u.name, u.email, u.city, u.is_seed, u.created_at, (select count(*)::int from bookings b where b.user_id = u.id) as spots
     from users u where not exists (select 1 from org_members m where m.user_id = u.id)
     order by u.created_at desc limit 500`,
  );
}

export async function ownerOf(orgId: string): Promise<{ id: string; name: string; email: string | null } | null> {
  return queryOne(
    `select u.id, u.name, u.email from org_members m join users u on u.id = m.user_id where m.org_id = $1 order by (m.role = 'owner') desc limit 1`,
    [orgId],
  );
}

export async function deleteOrg(id: string): Promise<void> {
  const members = await query<{ user_id: string }>("select user_id from org_members where org_id = $1", [id]);
  await query("delete from organisations where id = $1", [id]);
  for (const m of members) {
    await query("update users set role = 'volunteer' where id = $1 and role = 'ngo_member' and not exists (select 1 from org_members where user_id = $1)", [m.user_id]);
  }
}

/** Hidden activities ("closed") are not shown to volunteers. */
export async function setActivityVisible(id: string, visible: boolean): Promise<void> {
  await query("update tasks set status = $2 where id = $1", [id, visible ? "published" : "closed"]);
}

export async function deleteActivity(id: string): Promise<void> {
  await query("delete from tasks where id = $1", [id]);
}

const SPOT_STATUSES = ["booked", "awaiting_confirmation", "confirmed", "released_early", "released_late", "attended", "no_show"];

export async function setSpotStatus(id: string, status: string): Promise<void> {
  if (!SPOT_STATUSES.includes(status)) return;
  const freed = status.startsWith("released");
  await query(
    `update bookings set status = $2,
       confirmed_at = case when $2 in ('confirmed','attended') then coalesce(confirmed_at, now()) else confirmed_at end,
       released_at = case when $3 then coalesce(released_at, now()) else null end,
       release_reason = case when $3 then release_reason else null end
     where id = $1`,
    [id, status, freed],
  );
}

export async function deleteSpot(id: string): Promise<void> {
  await query("delete from bookings where id = $1", [id]);
}
