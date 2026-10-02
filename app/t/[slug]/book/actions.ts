"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { createBooking } from "@/lib/data/bookings";
import { manualStandby, saveManualStandby } from "@/lib/data/queues";
import { siteUrl } from "@/lib/site";

const REASON = {
  full: "That session just filled up. Released seats reopen on the task page.",
  trust_level: "This task is open to a higher trust level than yours.",
  paused: "Verified-only and Trusted-only tasks are paused for you after two no-shows.",
  already_booked: "You already have a booking for this session.",
  started: "This session has already started.",
} as const;

export async function bookAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const slug = String(form.get("slug"));
  const occurrenceId = String(form.get("occurrence_id"));
  const source = form.get("source") === "feed" ? "feed" : "link";
  const user = await requireUser(`/t/${slug}/book?o=${occurrenceId}`);
  const res = await createBooking({ user, occurrenceId, source, now: await now(), origin: await siteUrl() });
  if (!res.ok) return { error: REASON[res.reason] };
  redirect(`/me?booked=${res.booking.id}`);
}

const SAVE_ERROR = {
  full: "All spots are taken.",
  trust_level: "This one is for volunteers whose ID we've checked.",
  paused: "You can't join this one just yet.",
  already_booked: "You already have a spot here.",
  started: "This one's already happened.",
} as const;

export interface SaveState {
  ok?: boolean;
  asked?: boolean;
  error?: string;
}

/** "Yes, save my spot" from the bottom sheet: stays on the activity page. */
export async function saveSpotAction(_prev: SaveState, form: FormData): Promise<SaveState> {
  const slug = String(form.get("slug"));
  const occurrenceId = String(form.get("occurrence_id"));
  const user = await requireUser(`/t/${slug}?o=${occurrenceId}&save=1`);
  const source = form.get("source") === "feed" ? "feed" : "link";
  const res = await createBooking({ user, occurrenceId, source, now: await now(), origin: await siteUrl() });
  if (!res.ok) return { error: SAVE_ERROR[res.reason] };
  // The page is refreshed when the sheet closes, so the "You're in!" screen stays up.
  return { ok: true, asked: res.booking.status === "requested" };
}

/** "Tell me if a spot opens": adds the volunteer to the standby list our team works from. */
export async function waitlistAction(_prev: { done?: boolean }, form: FormData): Promise<{ done?: boolean }> {
  const slug = String(form.get("slug"));
  const user = await requireUser(`/t/${slug}`);
  if (!user.phone) return {};
  const list = await manualStandby();
  if (!list.some((p) => p.phone === user.phone)) await saveManualStandby([...list, { name: user.name, phone: user.phone }]);
  return { done: true };
}
