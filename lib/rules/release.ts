// §5.3 Confirm-and-release loop and §5.4 attendance window.
import { HOUR_MS, RULES } from "./config";
import type { BookingStatus } from "./types";

export function hoursUntil(startAt: Date, now: Date): number {
  return (startAt.getTime() - now.getTime()) / HOUR_MS;
}

/** Last moment a release is free of penalty (T−24h). */
export function freeReleaseDeadline(startAt: Date, rules = RULES): Date {
  return new Date(startAt.getTime() - rules.freeReleaseHours * HOUR_MS);
}

/** Before T−24h → early (no penalty). From T−24h to start → late. */
export function releaseType(
  startAt: Date,
  now: Date,
  rules = RULES,
): "released_early" | "released_late" | null {
  if (now.getTime() >= startAt.getTime()) return null; // slot already started
  return now.getTime() < freeReleaseDeadline(startAt, rules).getTime()
    ? "released_early"
    : "released_late";
}

/** A booking made inside 48 hours is treated as already confirmed. */
export function initialBookingStatus(
  startAt: Date,
  now: Date,
  rules = RULES,
): "booked" | "confirmed" {
  return hoursUntil(startAt, now) <= rules.confirmRequestHours ? "confirmed" : "booked";
}

/** At T−48h a `booked` booking moves to `awaiting_confirmation`. */
export function shouldAwaitConfirmation(
  status: BookingStatus,
  startAt: Date,
  now: Date,
  rules = RULES,
): boolean {
  return (
    status === "booked" &&
    hoursUntil(startAt, now) <= rules.confirmRequestHours &&
    now.getTime() < startAt.getTime()
  );
}

/** Shown amber in the turnout view from T−24h. There is no auto-cancel. */
export function isUnconfirmed(
  status: BookingStatus,
  startAt: Date,
  now: Date,
  rules = RULES,
): boolean {
  return (
    (status === "booked" || status === "awaiting_confirmation") &&
    hoursUntil(startAt, now) <= rules.freeReleaseHours
  );
}

export type ReminderType = "confirmation_request" | "confirmation_reminder" | "day_of_reminder";

export interface DueReminder {
  type: ReminderType;
  dueAt: Date;
}

/**
 * Every scheduled message for a booking, computed from the occurrence start.
 * Confirmation messages stop once the volunteer has confirmed; the day-of
 * reminder goes to every active booking.
 */
export function remindersFor(
  status: BookingStatus,
  startAt: Date,
  createdAt: Date,
  rules = RULES,
): DueReminder[] {
  const at = (hours: number) => new Date(startAt.getTime() - hours * HOUR_MS);
  const out: DueReminder[] = [];
  const unconfirmed = status === "booked" || status === "awaiting_confirmation";
  // Bookings made inside the 48h window are confirmed at booking time.
  const bookedBeforeWindow = createdAt.getTime() < at(rules.confirmRequestHours).getTime();
  if (unconfirmed && bookedBeforeWindow) {
    out.push({ type: "confirmation_request", dueAt: at(rules.confirmRequestHours) });
    out.push({ type: "confirmation_reminder", dueAt: at(rules.confirmReminderHours) });
  }
  if (unconfirmed || status === "confirmed") {
    out.push({ type: "day_of_reminder", dueAt: at(rules.dayOfReminderHours) });
  }
  return out;
}

/** NGO can mark attendance from slot start until 72h after. */
export function canMarkAttendance(startAt: Date, now: Date, rules = RULES): boolean {
  const t = now.getTime();
  return (
    t >= startAt.getTime() &&
    t <= startAt.getTime() + rules.attendanceWindowHours * HOUR_MS
  );
}

/** An active booking still unmarked after 72h becomes `not_recorded`. */
export function shouldMarkNotRecorded(
  status: BookingStatus,
  startAt: Date,
  now: Date,
  rules = RULES,
): boolean {
  const active = status === "booked" || status === "awaiting_confirmation" || status === "confirmed";
  return active && now.getTime() > startAt.getTime() + rules.attendanceWindowHours * HOUR_MS;
}
