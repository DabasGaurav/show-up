"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { createOrg, getOrgForUser, isValidInviteCode } from "@/lib/data/orgs";
import { isMvp } from "@/lib/flags";
import { normalisePhone } from "@/lib/format";

export interface JoinState {
  error?: string;
  fields?: Record<string, string>;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function joinAction(_prev: JoinState, form: FormData): Promise<JoinState> {
  const user = await requireUser("/ngo/join");
  if (await getOrgForUser(user.id)) redirect("/ngo");

  const fields = Object.fromEntries(
    ["invite_code", "name", "city", "contact_name", "contact_phone", "registration_no", "tax_12a_80g", "about"].map(
      (k) => [k, str(form.get(k))],
    ),
  );
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): JoinState => ({ error, fields });

  if (isMvp && !(await isValidInviteCode(fields.invite_code))) {
    return fail("That invite code isn't valid. Ask the Show-Up team for your code.");
  }
  if (fields.name.length < 3) return fail("Enter your NGO's name.");
  if (!CITY_NAMES.includes(fields.city)) return fail("Choose your city.");
  if (causes.length === 0) return fail("Choose at least one cause.");
  if (fields.contact_name.length < 2) return fail("Enter the contact person's name.");
  const phone = normalisePhone(fields.contact_phone);
  if (!phone) return fail("Enter a 10-digit Indian mobile number for the contact person.");
  // The registration number is what Show-Up checks for the Verified NGO badge; optional in MVP1.
  if (!isMvp && fields.registration_no.length < 4) return fail("Enter your registration number.");

  await createOrg(user.id, {
    name: fields.name,
    city: fields.city,
    causes,
    contactName: fields.contact_name,
    contactPhone: phone,
    registrationNo: fields.registration_no || null,
    tax12a80g: fields.tax_12a_80g || null,
    about: fields.about || null,
    inviteCode: fields.invite_code ? fields.invite_code.toUpperCase() : null,
  });
  redirect("/ngo");
}
