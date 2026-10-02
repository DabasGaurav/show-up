"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { query } from "@/lib/db";

export interface ContactState {
  error?: string;
  fields?: { name: string; email: string; message: string };
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** "Write to us." The message is kept for the team to read in /admin. */
export async function contactAction(_prev: ContactState, form: FormData): Promise<ContactState> {
  const fields = { name: str(form.get("name")), email: str(form.get("email")).toLowerCase(), message: str(form.get("message")) };
  // A hidden box people never see; anything in it is a script filling in forms.
  if (str(form.get("website"))) redirect("/?toast=written");
  if (fields.name.length < 2) return { error: "Please add your name.", fields };
  if (!/^\S+@\S+\.\S+$/.test(fields.email)) return { error: "That email doesn't look right.", fields };
  if (fields.message.length < 5) return { error: "Please write your message.", fields };
  const user = await getUser();
  await query("insert into contact_messages (user_id, name, email, message) values ($1, $2, $3, $4)", [user?.id ?? null, fields.name, fields.email, fields.message.slice(0, 2000)]);
  redirect("/?toast=written");
}
