"use server";

import { redirect } from "next/navigation";
import { safeNext, signOut } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import { startSignIn } from "@/lib/signin";
import { siteUrl } from "@/lib/site";

export interface SignInState {
  sent?: boolean;
  email?: string;
  /** Shown only when no email provider is set up (local testing). */
  link?: string | null;
  error?: string;
  fields?: { name: string; phone: string; email: string };
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const fields = { name: str(form.get("name")), phone: str(form.get("phone")), email: str(form.get("email")).toLowerCase() };
  const fail = (error: string): SignInState => ({ error, fields });
  if (fields.name.length < 2) return fail("Please add your name.");
  const phone = normalisePhone(fields.phone);
  if (!phone) return fail("That number doesn't look right. It should have 10 digits.");
  if (!/^\S+@\S+\.\S+$/.test(fields.email)) return fail("That email doesn't look right.");
  const res = await startSignIn({ name: fields.name, phone, email: fields.email, next: safeNext(str(form.get("next"))) }, await siteUrl());
  if (!res.ok) return fail(res.error);
  return { sent: true, email: fields.email, link: res.link };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/?toast=out");
}
