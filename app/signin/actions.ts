"use server";

import { redirect } from "next/navigation";
import { safeNext, signOut } from "@/lib/auth";
import { hasAccount, startSignIn } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface SignInState {
  sent?: boolean;
  email?: string;
  /** Shown only when no email provider is set up (local testing). */
  link?: string | null;
  error?: string;
  /** No account with this email yet: point the person to sign-up. */
  unknown?: boolean;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = str(form.get("email")).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That email doesn't look right.", email };
  if (!(await hasAccount(email))) return { unknown: true, email };
  const res = await startSignIn({ email, next: safeNext(str(form.get("next"))) }, await siteUrl());
  if (!res.ok) return { error: res.error, email };
  return { sent: true, email, link: res.link };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/?toast=out");
}
