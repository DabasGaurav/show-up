"use server";

import { redirect } from "next/navigation";
import { safeNext, signIn, signOut } from "@/lib/auth";
import { CAUSES } from "@/lib/constants";
import { readPlace } from "@/lib/place";
import { hasAccount, startSignIn, testLogin } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface SignInState {
  sent?: boolean;
  /** Signed in: the page to load next. */
  go?: string;
  /** Someone new: the same form now asks for their details. */
  isNew?: boolean;
  email?: string;
  /** Shown only when no email provider is set up (local testing). */
  link?: string | null;
  error?: string;
  fields?: Record<string, string>;
  /** The city or town as it will be stored. */
  place?: string;
  causes?: string[];
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** One door for volunteers: an email we know gets a sign-in link, a new one gets asked for details and then its link. */
export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = str(form.get("email")).toLowerCase();
  const next = safeNext(str(form.get("next")), "/start");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That email doesn't look right.", email };

  // Test accounts (TEST_LOGINS on the host) sign in straight away, with no email link.
  const testUser = await testLogin(email);
  if (testUser) {
    await signIn(testUser);
    // The browser loads the next page itself, so it is always asked for as the signed-in person.
    return { go: `${next}${next.includes("?") ? "&" : "?"}toast=in`, email };
  }

  if (await hasAccount(email)) {
    const res = await startSignIn({ email, next }, await siteUrl());
    return res.ok ? { sent: true, email, link: res.link } : { error: res.error, email };
  }
  if (form.get("step") !== "details") return { isNew: true, email };

  const fields = { name: str(form.get("name")), city: str(form.get("city")), city_other: str(form.get("city_other")) };
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const fail = (error: string): SignInState => ({ isNew: true, error, email, fields, causes, place: readPlace(form, true) ?? fields.city_other });
  if (fields.name.length < 2) return fail("Please add your name.");
  const city = readPlace(form, true);
  if (!city) return fail("Pick your city, or type your town.");
  // The mobile number is asked for later, on the first spot they save.
  const res = await startSignIn({ email, next, signup: { name: fields.name, city, causes } }, await siteUrl());
  return res.ok ? { sent: true, email, link: res.link } : fail(res.error);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/?toast=out");
}
