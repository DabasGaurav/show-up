"use server";

import { redirect } from "next/navigation";
import { createAccount, login } from "@/lib/accounts";
import { safeNext, signIn, signOut } from "@/lib/auth";
import { CAUSES } from "@/lib/constants";
import { readPlace } from "@/lib/place";
import { LIMITS, forget, note, tooMany, visitor } from "@/lib/rate-limit";
import { testLogin } from "@/lib/signin";
import { isEmail, nameProblem, passwordProblem } from "@/lib/validate";

export interface SignInState {
  /** Signed in: the page to load next. */
  go?: string;
  error?: string;
  /** The other form is the right one: "new" = no account yet, "existing" = already has one. */
  hint?: "new" | "existing";
  fields?: Record<string, string>;
  /** The city or town as it will be stored. */
  place?: string;
  causes?: string[];
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
// The browser loads the next page itself, so it is always asked for as the signed-in person.
const onward = (next: string) => `${next}${next.includes("?") ? "&" : "?"}toast=in`;

/** Sign in: email and password. */
export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = str(form.get("email")).toLowerCase();
  const next = safeNext(str(form.get("next")), "/start");
  const fields = { email };
  if (!isEmail(email)) return { error: "That email doesn't look right.", fields };

  // Test accounts (TEST_LOGINS on the host) sign in with any password.
  const testUser = await testLogin(email);
  if (testUser) {
    await signIn(testUser);
    return { go: onward(next) };
  }

  // Slow down guessing: a pause after too many wrong passwords for one email, or from one visitor.
  const who = await visitor();
  const keys = [`wrong:${email}`, `wrong-from:${who}`];
  if ((await tooMany(keys[0], LIMITS.wrongPasswords.max, LIMITS.wrongPasswords.minutes)) || (await tooMany(keys[1], LIMITS.wrongFromVisitor.max, LIMITS.wrongFromVisitor.minutes))) {
    return { error: "Too many tries. Wait 15 minutes, then try again.", fields };
  }
  const password = String(form.get("password") ?? "");
  const res = password.length > 200 ? ({ ok: false, why: "wrong" } as const) : await login(email, password);
  if (res.ok) {
    await forget(keys[0]);
    await signIn(res.userId);
    return { go: onward(next) };
  }
  if (res.why === "unknown") return { hint: "new", fields };
  for (const k of keys) await note(k);
  if (res.why === "no_password") return { error: "This account has no password yet. Write to us and we'll set one for you.", fields };
  return { error: "That password isn't right. Try again.", fields };
}

/** Sign up to volunteer: the account is ready straight away. */
export async function signUpAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = str(form.get("email")).toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(str(form.get("next")), "/start");
  const fields = { email, name: str(form.get("name")), city_other: str(form.get("city_other")) };
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const city = readPlace(form, true);
  const fail = (error: string): SignInState => ({ error, fields, causes, place: city ?? fields.city_other });
  const problem = nameProblem(fields.name) ?? (isEmail(email) ? null : "That email doesn't look right.") ?? passwordProblem(password);
  if (problem) return fail(problem);
  if (!city) return fail("Pick your city, or type your town.");
  const who = `signup-from:${await visitor()}`;
  if (await tooMany(who, LIMITS.signUps.max, LIMITS.signUps.minutes)) return fail("Too many new accounts from here just now. Try again in an hour.");
  // The mobile number is asked for later, on the first spot they save.
  const userId = await createAccount({ name: fields.name, email, password, city, causes });
  if (!userId) return { ...fail(""), error: undefined, hint: "existing" };
  await note(who);
  await signIn(userId);
  return { go: onward(next) };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/?toast=out");
}
