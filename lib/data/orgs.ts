import "server-only";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { slugify } from "@/lib/format";

export interface Org {
  id: string;
  name: string;
  slug: string;
  city: string;
  causes: string[];
  registration_no: string | null;
  /** Set when our team approves the NGO. This is the ✓. */
  verified_at: Date | null;
  about: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
}

export const suffix = (bytes = 2) => randomBytes(bytes).toString("hex");

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  return queryOne<Org>("select * from organisations where slug = $1", [slug]);
}

/** The NGO a person coordinates. */
export async function getOrgForUser(userId: string): Promise<Org | null> {
  return queryOne<Org>(
    `select o.* from organisations o join org_members m on m.org_id = o.id
     where m.user_id = $1 order by o.created_at limit 1`,
    [userId],
  );
}

export interface NewOrg {
  name: string;
  city: string;
  causes: string[];
  contactName: string;
  contactRole: string;
  contactPhone: string;
  registrationNo: string | null;
  about: string | null;
}

/** NGO sign-up. The NGO's activities stay hidden until an admin approves it. */
export async function createOrg(userId: string, o: NewOrg): Promise<Org> {
  const [org] = await query<Org>(
    `insert into organisations (name, slug, city, causes, contact_name, contact_phone, registration_no, about, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') returning *`,
    [o.name, `${slugify(o.name)}-${suffix()}`, o.city, o.causes, o.contactName, o.contactPhone, o.registrationNo, o.about],
  );
  await query("insert into org_members (org_id, user_id, role) values ($1, $2, 'owner')", [org.id, userId]);
  await query("update users set role = 'ngo_member' where id = $1 and role = 'volunteer'", [userId]);
  // The person's role is reused as the default "contact on the day" role.
  await query(
    "insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value",
    [`org_role:${org.id}`, JSON.stringify(o.contactRole)],
  );
  return org;
}

export async function contactRole(orgId: string): Promise<string> {
  const row = await queryOne<{ value: string }>("select value from app_state where key = $1", [`org_role:${orgId}`]);
  return typeof row?.value === "string" ? row.value : "";
}

export async function listOrgs(): Promise<(Org & { owner_name: string | null; owner_email: string | null; owner_role: string | null; activities: number })[]> {
  return query(
    `select o.*, u.name as owner_name, u.email as owner_email,
            (select value #>> '{}' from app_state where key = 'org_role:' || o.id) as owner_role,
            (select count(*)::int from tasks t where t.org_id = o.id) as activities
     from organisations o
     left join org_members m on m.org_id = o.id and m.role = 'owner'
     left join users u on u.id = m.user_id
     order by (o.status = 'pending') desc, o.created_at desc`,
  );
}

/** Approving gives the ✓ and makes the NGO's activities visible. */
export async function decideOrg(id: string, approve: boolean): Promise<void> {
  await query(
    "update organisations set status = $2, verified_at = case when $3 then coalesce(verified_at, now()) else null end where id = $1",
    [id, approve ? "approved" : "rejected", approve],
  );
}

/** Small stats for the NGO page. */
export async function orgStats(orgId: string, now: Date): Promise<{ volunteers: number; activitiesRun: number }> {
  const row = await queryOne<{ volunteers: number; run: number }>(
    `select
       (select count(distinct b.user_id)::int from bookings b
          join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
         where t.org_id = $1 and b.status in ('booked','awaiting_confirmation','confirmed','attended')) as volunteers,
       (select count(*)::int from task_occurrences oc join tasks t on t.id = oc.task_id
         where t.org_id = $1 and oc.end_at < $2) as run`,
    [orgId, now],
  );
  return { volunteers: row?.volunteers ?? 0, activitiesRun: row?.run ?? 0 };
}
