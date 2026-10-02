"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { markMoved, snoozeNudge } from "@/lib/data/nudges";
import { acceptOffer, clearStandby, declineOffer, getOffer, setStandby } from "@/lib/data/standby";
import { query } from "@/lib/db";
import { track } from "@/lib/events";
import { requireFeature } from "@/lib/flags";
import { siteUrl } from "@/lib/site";

const causesOf = (form: FormData) => form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));

/** "Free at short notice?" switch (F11). */
export async function setStandbyAction(form: FormData) {
  requireFeature("F11");
  const user = await requireUser("/me");
  const date = String(form.get("date"));
  const where = String(form.get("where"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const online = where === ONLINE;
  if (!online && !CITY_NAMES.includes(where)) return;
  const causes = causesOf(form);
  await setStandby(user.id, { date, city: online ? null : where, isOnline: online, causes });
  await track("standby_toggled", { on: true, date, where, causes }, user.id);
  revalidatePath("/me");
}

export async function clearStandbyAction(form: FormData) {
  requireFeature("F11");
  const user = await requireUser("/me");
  await clearStandby(user.id, String(form.get("id")));
  await track("standby_toggled", { on: false }, user.id);
  revalidatePath("/me");
}

export async function answerOfferAction(form: FormData) {
  requireFeature("F11");
  const id = String(form.get("offer_id"));
  const user = await requireUser(`/standby/${id}`);
  const offer = await getOffer(id);
  if (!offer || offer.user_id !== user.id) return;
  if (form.get("answer") === "accept") {
    const res = await acceptOffer(offer, user, await now(), await siteUrl());
    if (res.ok) redirect(`/me?booked=${res.bookingId}`);
  } else {
    await declineOffer(offer);
  }
  revalidatePath("/me");
  revalidatePath(`/standby/${id}`);
}

/** Dismiss / Not now on the re-engagement nudge (F12). Both are logged for SH4. */
export async function snoozeNudgeAction(form: FormData) {
  requireFeature("F12");
  const user = await requireUser("/me");
  const how = form.get("how") === "dismiss" ? "dismiss" : "not_now";
  await snoozeNudge(user.id, await now(), how === "dismiss" ? 7 : 1);
  await track("nudge_dismissed", { how }, user.id);
  revalidatePath("/me");
  revalidatePath("/feed");
}

/** Saved causes and city on My profile. Changing city triggers a nudge (§5.9). */
export async function saveProfileAction(form: FormData) {
  requireFeature("F16");
  const user = await requireUser("/me/profile");
  const city = String(form.get("city"));
  if (!CITY_NAMES.includes(city)) return;
  await query("update users set city = $2, saved_causes = $3, is_online_ok = $4 where id = $1", [
    user.id, city, causesOf(form), form.get("is_online_ok") === "on",
  ]);
  if (city !== user.city) await markMoved(user.id, await now());
  revalidatePath("/me/profile");
  redirect(city !== user.city ? "/me?moved=1" : "/me/profile?saved=1");
}
