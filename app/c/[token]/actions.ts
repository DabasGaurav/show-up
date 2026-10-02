"use server";

import { redirect } from "next/navigation";
import { now } from "@/lib/clock";
import { REASONS, type Reason } from "@/lib/constants";
import { freeSpot, getSpotByToken, sayYes } from "@/lib/data/bookings";

// The token in the link is what proves who this is: long, random, one per spot.

const back = (form: FormData, token: string) => (form.get("back") === "me" ? "/me" : `/c/${token}`);

export async function yesAction(form: FormData): Promise<void> {
  const s = await getSpotByToken(String(form.get("token")));
  if (!s) return;
  await sayYes(s, await now());
  redirect(`${back(form, s.confirm_token)}?toast=yes`);
}

export async function cantAction(form: FormData): Promise<void> {
  const s = await getSpotByToken(String(form.get("token")));
  if (!s) return;
  const r = String(form.get("reason") ?? "");
  await freeSpot(s, (REASONS as readonly string[]).includes(r) ? (r as Reason) : null, await now());
  redirect(`/c/${s.confirm_token}`);
}
