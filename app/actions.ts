"use server";

import { redirect } from "next/navigation";
import { query } from "@/lib/db";

/** "Tell me when something's on." Keeps the email with what the person was looking for. */
export async function joinWaitlistAction(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const filters = String(form.get("filters") ?? "").slice(0, 200);
  const back = `/${filters ? `?${filters}&` : "?"}toast=`;
  if (!/^\S+@\S+\.\S+$/.test(email)) redirect(`${back}bademail`);
  await query("insert into waitlist_emails (email, filters) values ($1, $2) on conflict (email, filters) do nothing", [email, filters]);
  redirect(`${back}waitlist`);
}
