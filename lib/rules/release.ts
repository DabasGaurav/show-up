// Saving, confirming and freeing a spot, and when the NGO can mark who came (spec §3).
import { DAY_MS, HOUR_MS, RULES } from "./config";
import type { BookingStatus } from "./types";

/** The last moment a spot can be freed with nothing going on the record. */
export function freeBy(startAt: Date): Date {
  return new Date(startAt.getTime() - RULES.freeHours * HOUR_MS);
}

/** When the "Still on?" email goes out. */
export function checkInAt(startAt: Date): Date {
  return new Date(startAt.getTime() - RULES.checkInHours * HOUR_MS);
}

/** At least a day before → free. Later → "freed late". After the start it cannot be freed. */
export function freeType(startAt: Date, now: Date): "released_early" | "released_late" | null {
  if (now.getTime() >= startAt.getTime()) return null;
  return now.getTime() <= freeBy(startAt).getTime() ? "released_early" : "released_late";
}

/** Someone who joins inside the last 2 days has just said yes, so they start as confirmed. */
export function statusOnSave(startAt: Date, now: Date): "booked" | "confirmed" {
  return now.getTime() >= checkInAt(startAt).getTime() ? "confirmed" : "booked";
}

/** "Yes, I'll be there" is offered from 2 days before. */
export function canSayYes(status: BookingStatus, startAt: Date, now: Date): boolean {
  return (status === "booked" || status === "awaiting_confirmation") && now.getTime() >= checkInAt(startAt).getTime() && now.getTime() < startAt.getTime();
}

/** "Morning of" email: 7 am that day, or 2 hours before an early start. */
export function morningOf(startAt: Date): Date {
  const IST = 5.5 * HOUR_MS;
  const dayStart = Math.floor((startAt.getTime() + IST) / DAY_MS) * DAY_MS - IST;
  return new Date(Math.min(dayStart + 7 * HOUR_MS, startAt.getTime() - 2 * HOUR_MS));
}

/** The NGO marks Came / Didn't come any time from the start until 3 days after. */
export function canMark(startAt: Date, now: Date): boolean {
  const t = now.getTime();
  return t >= startAt.getTime() && t <= startAt.getTime() + RULES.markDays * DAY_MS;
}
