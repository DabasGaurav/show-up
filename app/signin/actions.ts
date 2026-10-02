"use server";

import { redirect } from "next/navigation";
import { safeNext, signOut } from "@/lib/auth";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { normalisePhone } from "@/lib/format";
import { hasAccount, startSignIn } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface SignInState {
  sent?: boolean;
  /** Someone new: the same form now asks for their details. */
  isNew?: boolean;
  email?: string;
  /** Shown only when no email provider is set up (local testing). */
  link?: string | null;
  error?: string;
  fields?: Record<string, string>;
  causes?: string[];
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** One door for volunteers: an email we know gets a sign-in link, a new one gets asked for details and then its link. */
export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = str(form.get("email")).toLowerCase();
  const next = safeNext(str(form.get("next")));
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That email doesn't look right.", email };

  if (await hasAccount(email)) {
    const res = await startSignIn({ email, next }, await siteUrl());
    return res.ok ? { sent: true, email, link: res.link } : { error: res.error, email };
  }
  if (form.get("step") !== "details") return { isNew: true, email };

  const fields = { name: str(form.get("name")), phone: str(form.get("phone")), city: str(form.get("city")) };
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): SignInState => ({ isNew: true, error, email, fields, causes });
  if (fields.name.length < 2) return fail("Please add your name.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  if (![...CITY_NAMES, ONLINE].includes(fields.city)) return fail("Pick your city.");
  const res = await startSignIn({ email, next, signup: { name: fields.name, phone, city: fields.city, causes } }, await siteUrl());
  return res.ok ? { sent: true, email, link: res.link } : fail(res.error);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/?toast=out");
}
