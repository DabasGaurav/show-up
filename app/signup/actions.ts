"use server";

import { safeNext } from "@/lib/auth";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { normalisePhone } from "@/lib/format";
import { hasAccount, startSignIn } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface SignUpState {
  sent?: boolean;
  email?: string;
  link?: string | null;
  error?: string;
  /** This email already has an account: point the person to sign-in. */
  exists?: boolean;
  fields?: Record<string, string>;
  causes?: string[];
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function signUpAction(_prev: SignUpState, form: FormData): Promise<SignUpState> {
  const fields = { name: str(form.get("name")), phone: str(form.get("phone")), email: str(form.get("email")).toLowerCase(), city: str(form.get("city")) };
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): SignUpState => ({ error, fields, causes });
  if (fields.name.length < 2) return fail("Please add your name.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  if (!/^\S+@\S+\.\S+$/.test(fields.email)) return fail("That email doesn't look right.");
  if (![...CITY_NAMES, ONLINE].includes(fields.city)) return fail("Pick your city.");
  if (await hasAccount(fields.email)) return { exists: true, fields, causes };
  const res = await startSignIn(
    { email: fields.email, next: safeNext(str(form.get("next")), "/account"), signup: { name: fields.name, phone, city: fields.city, causes } },
    await siteUrl(),
  );
  if (!res.ok) return fail(res.error);
  return { sent: true, email: fields.email, link: res.link };
}
