import "server-only";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { slugify } from "@/lib/format";

export interface Org {
  id: string;
  type: "ngo" | "college" | "company" | "community";
  name: string;
  slug: string;
  city: string;
  causes: string[];
  registration_no: string | null;
  tax_12a_80g: string | null;
  verified_at: Date | null;
  about: string | null;
  photos: string[];
  contact_name: string | null;
  contact_phone: string | null;
  invite_code: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
}

export const suffix = (bytes = 3) => randomBytes(bytes).toString("hex");

export async function getOrg(id: string): Promise<Org | null> {
  return queryOne<Org>("select * from organisations where id = $1", [id]);
}

/** The organisation a user coordinates (first one; the model allows several, §18). */
export async function getOrgForUser(userId: string): Promise<Org | null> {
  return queryOne<Org>(
    `select o.* from organisations o
     join org_members m on m.org_id = o.id
     where m.user_id = $1
     order by o.created_at
     limit 1`,
    [userId],
  );
}

export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  return (
    (await queryOne("select 1 as ok from org_members where user_id = $1 and org_id = $2", [userId, orgId])) !== null
  );
}

export interface NewOrg {
  name: string;
  city: string;
  causes: string[];
  contactName: string;
  contactPhone: string;
  registrationNo: string | null;
  tax12a80g: string | null;
  about: string | null;
  inviteCode: string | null;
}

export async function createOrg(userId: string, o: NewOrg): Promise<Org> {
  const [org] = await query<Org>(
    `insert into organisations
       (name, slug, city, causes, contact_name, contact_phone, registration_no, tax_12a_80g, about, invite_code)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning *`,
    [
      o.name,
      `${slugify(o.name)}-${suffix(2)}`,
      o.city,
      o.causes,
      o.contactName,
      o.contactPhone,
      o.registrationNo,
      o.tax12a80g,
      o.about,
      o.inviteCode,
    ],
  );
  await query("insert into org_members (org_id, user_id, role) values ($1, $2, 'owner')", [org.id, userId]);
  await query("update users set role = 'ngo_member' where id = $1 and role = 'volunteer'", [userId]);
  return org;
}

export async function listOrgs(): Promise<(Org & { owner_name: string | null; task_count: number })[]> {
  return query(
    `select o.*,
            (select u.name from org_members m join users u on u.id = m.user_id
              where m.org_id = o.id order by m.role desc limit 1) as owner_name,
            (select count(*)::int from tasks t where t.org_id = o.id) as task_count
     from organisations o
     order by (o.status = 'pending') desc, o.created_at desc`,
  );
}

export async function setOrgStatus(id: string, status: Org["status"]): Promise<void> {
  await query("update organisations set status = $2 where id = $1", [id, status]);
}

/** "Verified NGO" badge: registration checked by Show-Up (F10). */
export async function setOrgVerified(id: string, verified: boolean): Promise<void> {
  await query("update organisations set verified_at = case when $2 then now() else null end where id = $1", [
    id,
    verified,
  ]);
}

// --- Invite codes (MVP1 onboarding, §4.2) ---

const CODES_KEY = "invite_codes";

export async function inviteCodes(): Promise<string[]> {
  const fromEnv = (process.env.NGO_INVITE_CODES ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  const row = await queryOne<{ value: string[] }>("select value from app_state where key = $1", [CODES_KEY]);
  return [...new Set([...fromEnv, ...(row?.value ?? [])])];
}

export async function addInviteCode(): Promise<string> {
  const code = `SU-${suffix(3).toUpperCase()}`;
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb)
     on conflict (key) do update set value = app_state.value || excluded.value`,
    [CODES_KEY, JSON.stringify([code])],
  );
  return code;
}

export async function isValidInviteCode(code: string): Promise<boolean> {
  const wanted = code.trim().toUpperCase();
  return wanted.length > 0 && (await inviteCodes()).some((c) => c.toUpperCase() === wanted);
}
