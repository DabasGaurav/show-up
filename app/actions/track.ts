"use server";

import { getUser } from "@/lib/auth";
import { track, type EventName } from "@/lib/events";

// Events the browser may log (taps and views the server cannot see on its own).
const CLIENT_EVENTS = new Set<EventName>([
  "filter_changed",
  "contact_ngo_tapped",
  "nudge_opened",
  "nudge_dismissed",
  "lab_profile_opened",
  "lab_ngo_profile_opened",
]);

export async function trackAction(name: EventName, props: Record<string, string | number | boolean | null> = {}) {
  if (!CLIENT_EVENTS.has(name)) return;
  await track(name, props, (await getUser())?.id ?? null);
}
