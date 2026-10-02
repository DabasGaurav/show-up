"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { createOrg, getOrgForUser } from "@/lib/data/orgs";
import { normalisePhone } from "@/lib/format";

export interface NgoState {
  error?: string;
  fields?: Record<string, string>;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function ngoSignUpAction(_prev: NgoState, form: FormData): Promise<NgoState> {
  const user = await requireUser("/for-ngos");
  if (await getOrgForUser(user.id)) redirect("/dashboard");
  const fields = Object.fromEntries(["your_name", "role", "phone", "ngo_name", "city", "registration_no", "about"].map((k) => [k, str(form.get(k))]));
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): NgoState => ({ error, fields });

  if (fields.your_name.length < 2) return fail("Please add your name.");
  if (fields.role.length < 2) return fail("Tell us your role, like Founder or Coordinator.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  if (fields.ngo_name.length < 3) return fail("Please add your NGO's name.");
  if (!CITY_NAMES.includes(fields.city)) return fail("Pick your city.");
  if (causes.length === 0) return fail("Pick at least one cause.");

  await createOrg(user.id, {
    name: fields.ngo_name, city: fields.city, causes, contactName: fields.your_name, contactRole: fields.role, contactPhone: phone,
    registrationNo: fields.registration_no || null, about: fields.about || null,
  });
  redirect("/dashboard?toast=sent");
}
