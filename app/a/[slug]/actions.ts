"use server";

import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { saveSpot } from "@/lib/data/bookings";
import { query, queryOne } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { siteUrl } from "@/lib/site";

const WHY = {
  full: "All spots are taken.",
  already: "You already have a spot here.",
  started: "This one's already happened.",
} as const;

export interface SaveState {
  ok?: boolean;
  error?: string;
}

/** "Yes, save my spot." Stays on the activity page. */
export async function saveSpotAction(_prev: SaveState, form: FormData): Promise<SaveState> {
  const slug = String(form.get("slug"));
  const dateId = String(form.get("date_id"));
  const user = await requireUser(`/a/${slug}?d=${dateId}&save=1`);
  // First spot: name and mobile are asked for on the same sheet.
  if (!user.phone) {
    const name = String(form.get("name") ?? "").trim();
    const phone = normalisePhone(String(form.get("phone") ?? ""));
    if (name.length < 2 || name.length > 80) return { error: name.length < 2 ? "Please add your name." : "That name is too long." };
    if (!phone) return { error: "That number doesn't look right. It should have 10 digits." };
    if (await queryOne("select 1 as taken from users where phone = $1 and id <> $2", [phone, user.id])) return { error: "That number is on another account." };
    await query("update users set name = $2, phone = $3, phone_verified_at = null where id = $1", [user.id, name, phone]);
  }
  const res = await saveSpot(user, dateId, await now(), await siteUrl());
  return res.ok ? { ok: true } : { error: WHY[res.reason] };
}
