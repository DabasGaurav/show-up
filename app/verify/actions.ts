"use server";

import { redirect } from "next/navigation";
import { safeNext, signIn, signOut } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { isMvp } from "@/lib/flags";
import { normalisePhone } from "@/lib/format";
import { sendCode, verifyCode } from "@/lib/otp";

export interface VerifyState {
  step: "details" | "code";
  name: string;
  phone: string;
  email: string;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function verifyAction(prev: VerifyState, form: FormData): Promise<VerifyState> {
  const intent = str(form.get("intent"));

  if (intent === "back") return { ...prev, step: "details", error: undefined };

  if (intent === "send") {
    const name = str(form.get("name"));
    const email = str(form.get("email")).toLowerCase();
    const phone = normalisePhone(str(form.get("phone")));
    const state: VerifyState = { step: "details", name, phone: str(form.get("phone")), email };
    if (name.length < 2) return { ...state, error: "Enter your name." };
    if (!phone) return { ...state, error: "Enter a 10-digit Indian mobile number." };
    // MVP1 needs an email for reminders (§5.2).
    if (isMvp && !/^\S+@\S+\.\S+$/.test(email)) return { ...state, error: "Enter your email for reminders." };
    const sent = await sendCode(phone, email || null);
    if (!sent.ok) return { ...state, error: sent.error };
    return { step: "code", name, phone, email };
  }

  // intent === "verify"
  const code = str(form.get("code"));
  if (!(await verifyCode(prev.phone, code))) {
    return { ...prev, step: "code", error: "That code didn't match. Enter the 6 digits we sent." };
  }
  const existing = await queryOne<{ id: string }>("select id from users where phone = $1", [prev.phone]);
  let userId = existing?.id;
  if (userId) {
    await query(
      `update users set name = $2, email = coalesce(nullif($3, ''), email),
         phone_verified_at = coalesce(phone_verified_at, now()), last_active_at = now()
       where id = $1`,
      [userId, prev.name, prev.email],
    );
  } else {
    const [u] = await query<{ id: string }>(
      "insert into users (name, phone, email, phone_verified_at) values ($1, $2, nullif($3, ''), now()) returning id",
      [prev.name, prev.phone, prev.email],
    );
    userId = u.id;
  }
  await signIn(userId);
  redirect(safeNext(str(form.get("next"))));
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
