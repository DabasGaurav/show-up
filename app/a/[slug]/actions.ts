"use server";

import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { saveSpot } from "@/lib/data/bookings";
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
  const res = await saveSpot(user, dateId, await now(), await siteUrl());
  return res.ok ? { ok: true } : { error: WHY[res.reason] };
}
