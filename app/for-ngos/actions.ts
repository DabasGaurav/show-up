"use server";

import { redirect } from "next/navigation";
import { getUser, signIn } from "@/lib/auth";
import { CAUSES, HEARD_FROM } from "@/lib/constants";
import { readPlace } from "@/lib/place";
import { createOrg, getOrgForUser } from "@/lib/data/orgs";
import { normalisePhone } from "@/lib/format";
import { createAccount } from "@/lib/accounts";
import { LIMITS, note, tooMany, visitor } from "@/lib/rate-limit";
import { isEmail, nameProblem, passwordProblem } from "@/lib/validate";

export interface NgoState {
  /** Signed up and signed in: the page to load next. */
  go?: string;
  error?: string;
  exists?: boolean;
  fields?: Record<string, string>;
  causes?: string[];
  place?: string;
  sameWhatsapp?: boolean;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** NGO sign-up. Someone new gets their account and their NGO in one go, and is signed in straight away. */
export async function ngoSignUpAction(_prev: NgoState, form: FormData): Promise<NgoState> {
  const user = await getUser();
  if (user && (await getOrgForUser(user.id))) redirect("/dashboard");
  const fields = Object.fromEntries(["your_name", "role", "phone", "whatsapp", "email", "ngo_name", "city", "city_other", "registration_no", "about", "heard_from"].map((k) => [k, str(form.get(k))]));
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const sameWhatsapp = form.get("same_whatsapp") === "on";
  const place = readPlace(form, true);
  const fail = (error: string): NgoState => ({ error, fields, causes, place: place ?? fields.city_other, sameWhatsapp });

  const badName = nameProblem(fields.your_name);
  if (badName) return fail(badName);
  if (fields.role.length > 60 || fields.ngo_name.length > 120 || fields.about.length > 300 || fields.registration_no.length > 60) return fail("One of the answers is too long. Please shorten it.");
  if (fields.role.length < 2) return fail("Tell us your role, like Founder or Coordinator.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  const whatsapp = sameWhatsapp ? null : normalisePhone(fields.whatsapp);
  if (!sameWhatsapp && !whatsapp) return fail("That WhatsApp number doesn't look right. It should have 10 digits.");
  const email = fields.email.toLowerCase();
  if (!user && !isEmail(email)) return fail("That email doesn't look right.");
  const password = String(form.get("password") ?? "");
  const badPassword = user ? null : passwordProblem(password);
  if (badPassword) return fail(badPassword);
  if (fields.ngo_name.length < 3) return fail("Please add your NGO's name.");
  if (!place) return fail("Pick your city, or type your town or village.");
  if (causes.length === 0) return fail("Pick at least one cause.");

  const org = {
    name: fields.ngo_name, city: place, causes, contactName: fields.your_name, contactRole: fields.role, contactPhone: phone,
    registrationNo: fields.registration_no || null, about: fields.about || null, whatsappPhone: whatsapp,
    heardFrom: (HEARD_FROM as readonly string[]).includes(fields.heard_from) ? fields.heard_from : null,
  };
  if (user) {
    await createOrg(user.id, org);
    redirect("/dashboard?toast=sent");
  }
  const who = `signup-from:${await visitor()}`;
  if (await tooMany(who, LIMITS.signUps.max, LIMITS.signUps.minutes)) return fail("Too many new accounts from here just now. Try again in an hour.");
  const userId = await createAccount({ name: fields.your_name, email, password, phone, city: place, org });
  if (!userId) return { ...fail(""), error: undefined, exists: true };
  await note(who);
  await signIn(userId);
  // A full page load, so the dashboard is asked for as the signed-in coordinator.
  return { go: "/dashboard?toast=sent" };
}
