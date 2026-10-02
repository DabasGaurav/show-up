"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { createOrg, getOrgForUser } from "@/lib/data/orgs";
import { normalisePhone } from "@/lib/format";
import { hasAccount, startSignIn } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface NgoState {
  sent?: boolean;
  email?: string;
  link?: string | null;
  error?: string;
  exists?: boolean;
  fields?: Record<string, string>;
  causes?: string[];
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** NGO sign-up. Someone new gets their account and their NGO in one go, once they open the email link. */
export async function ngoSignUpAction(_prev: NgoState, form: FormData): Promise<NgoState> {
  const user = await getUser();
  if (user && (await getOrgForUser(user.id))) redirect("/dashboard");
  const fields = Object.fromEntries(["your_name", "role", "phone", "email", "ngo_name", "city", "registration_no", "about"].map((k) => [k, str(form.get(k))]));
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): NgoState => ({ error, fields, causes });

  if (fields.your_name.length < 2) return fail("Please add your name.");
  if (fields.role.length < 2) return fail("Tell us your role, like Founder or Coordinator.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  const email = fields.email.toLowerCase();
  if (!user && !/^\S+@\S+\.\S+$/.test(email)) return fail("That email doesn't look right.");
  if (fields.ngo_name.length < 3) return fail("Please add your NGO's name.");
  if (!CITY_NAMES.includes(fields.city)) return fail("Pick your city.");
  if (causes.length === 0) return fail("Pick at least one cause.");

  const org = {
    name: fields.ngo_name, city: fields.city, causes, contactName: fields.your_name, contactRole: fields.role, contactPhone: phone,
    registrationNo: fields.registration_no || null, about: fields.about || null,
  };
  if (user) {
    await createOrg(user.id, org);
    redirect("/dashboard?toast=sent");
  }
  if (await hasAccount(email)) return { exists: true, fields, causes };
  const res = await startSignIn({ email, next: "/dashboard", signup: { name: fields.your_name, phone, city: fields.city, org } }, await siteUrl());
  if (!res.ok) return fail(res.error);
  return { sent: true, email, link: res.link };
}
