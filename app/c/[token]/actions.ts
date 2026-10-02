"use server";

import { revalidatePath } from "next/cache";
import { now } from "@/lib/clock";
import { RELEASE_REASONS, type ReleaseReason } from "@/lib/constants";
import { confirmBooking, getBookingByToken, releaseBooking } from "@/lib/data/bookings";
import { afterRelease } from "@/lib/after-release";
import { siteUrl } from "@/lib/site";

// The token in the link is the credential: it is long, random and unique per booking.

export async function confirmAction(form: FormData): Promise<void> {
  const b = await getBookingByToken(String(form.get("token")));
  if (!b) return;
  await confirmBooking(b, await now());
  revalidatePath(`/c/${b.confirm_token}`);
  revalidatePath("/me");
}

export async function releaseAction(form: FormData): Promise<void> {
  const b = await getBookingByToken(String(form.get("token")));
  if (!b) return;
  const r = String(form.get("reason") ?? "");
  const reason = (RELEASE_REASONS as readonly string[]).includes(r) ? (r as ReleaseReason) : null;
  const at = await now();
  const res = await releaseBooking(b, reason, at);
  if (res.ok && res.type !== "withdrawn") await afterRelease(b, at, await siteUrl());
  revalidatePath(`/c/${b.confirm_token}`);
  revalidatePath("/me");
}
