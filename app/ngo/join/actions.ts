"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { createOrg, getOrgForUser, isValidInviteCode } from "@/lib/data/orgs";
import { query } from "@/lib/db";
import { isMvp } from "@/lib/flags";
import { normalisePhone } from "@/lib/format";

export interface JoinState {
  error?: string;
  /** Which step the problem is on (1–3). */
  step?: number;
  fields?: Record<string, string>;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function joinAction(_prev: JoinState, form: FormData): Promise<JoinState> {
  const user = await requireUser("/ngo/join");
  if (await getOrgForUser(user.id)) redirect("/ngo");

  const fields = Object.fromEntries(
    ["contact_name", "contact_role", "contact_phone", "name", "city", "registration_no", "invite_code"].map((k) => [k, str(form.get(k))]),
  );
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (step: number, error: string): JoinState => ({ error, step, fields });

  if (fields.contact_name.length < 2) return fail(1, "Please add your name.");
  if (fields.contact_role.length < 2) return fail(1, "Tell us your role, like Founder or Coordinator.");
  const phone = normalisePhone(fields.contact_phone);
  if (!phone) return fail(1, "That number doesn't look right. It should have 10 digits.");
  if (fields.name.length < 3) return fail(2, "Please add your NGO's name.");
  if (!CITY_NAMES.includes(fields.city)) return fail(2, "Pick your city.");
  if (causes.length === 0) return fail(2, "Pick at least one thing you work on.");
  // Only the live app needs a code from our team.
  if (isMvp && !(await isValidInviteCode(fields.invite_code))) {
    return fail(3, "That code didn't work. Ask the person on our team who gave it to you.");
  }

  const org = await createOrg(user.id, {
    name: fields.name,
    city: fields.city,
    causes,
    contactName: fields.contact_name,
    contactPhone: phone,
    registrationNo: fields.registration_no || null,
    tax12a80g: null,
    about: null,
    inviteCode: fields.invite_code ? fields.invite_code.toUpperCase() : null,
  });
  // Remembered so "Post a need" can prefill who to contact on the day.
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value`,
    [`org_role:${org.id}`, JSON.stringify(fields.contact_role)],
  );
  redirect("/ngo");
}
