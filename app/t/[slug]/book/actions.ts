"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { createBooking } from "@/lib/data/bookings";
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
