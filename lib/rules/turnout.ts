// Turnout view counts (F7, §6.1 Screen 9) and the MVP1 primary metric (§10.1).
import { isUnconfirmed } from "./release";
import { RULES } from "./config";
import type { BookingStatus } from "./types";
import { SEAT_STATUSES } from "./types";

export interface TurnoutBooking {
  status: BookingStatus;
  source?: string;
}

export interface Turnout {
  needed: number;
  booked: number;
  confirmed: number;
  unconfirmed: number;
  released: number;
  filledByStandby: number;
  gaps: number;
  seatsLeft: number;
}

/** booked = confirmed + unconfirmed + (attended | no_show | not_recorded). */
export function turnout(needed: number, bookings: TurnoutBooking[]): Turnout {
  const is = (...s: BookingStatus[]) => bookings.filter((b) => s.includes(b.status)).length;
  const booked = is(...SEAT_STATUSES);
  return {
    needed,
    booked,
    confirmed: is("confirmed"),
    unconfirmed: is("booked", "awaiting_confirmation"),
    released: is("released_early", "released_late"),
    filledByStandby: bookings.filter((b) => b.source === "standby" && SEAT_STATUSES.includes(b.status)).length,
    gaps: Math.max(0, needed - booked),
    seatsLeft: Math.max(0, needed - booked),
  };
}

export type ChipTone = "green" | "amber" | "grey" | "red" | "blue";

/** Status chip label and tone. Every status is shown with text as well as colour. */
export function statusChip(
  status: BookingStatus,
  startAt: Date,
  now: Date,
  rules = RULES,
): { label: string; tone: ChipTone } {
  switch (status) {
    case "requested": return { label: "Requested", tone: "blue" };
    case "booked":
    case "awaiting_confirmation":
      if (isUnconfirmed(status, startAt, now, rules)) return { label: "Unconfirmed", tone: "amber" };
      return status === "booked"
        ? { label: "Booked", tone: "blue" }
        : { label: "Awaiting confirmation", tone: "amber" };
    case "confirmed": return { label: "Confirmed", tone: "green" };
    case "released_early": return { label: "Released", tone: "grey" };
    case "released_late": return { label: "Released late", tone: "grey" };
    case "attended": return { label: "Attended", tone: "green" };
    case "no_show": return { label: "No-show", tone: "red" };
    case "not_recorded": return { label: "Not recorded", tone: "grey" };
    case "declined": return { label: "Declined", tone: "grey" };
    case "auto_released": return { label: "No reply — released", tone: "grey" };
  }
}

export interface MvpMetrics {
  total: number;
  attended: number;
  releasedEarly: number;
  releasedLate: number;
  noShows: number;
  /** (attended + released_early) ÷ all bookings for past occurrences, excluding not_recorded. */
  showUpOrEarlyReleaseRate: number | null;
  noShowRate: number | null;
  lateReleaseRate: number | null;
}

/** Pass every booking for occurrences that have already happened. */
export function mvpMetrics(pastBookings: { status: BookingStatus }[]): MvpMetrics {
  const n = (s: BookingStatus) => pastBookings.filter((b) => b.status === s).length;
  const attended = n("attended");
  const releasedEarly = n("released_early");
  const releasedLate = n("released_late");
  const noShows = n("no_show");
  const total = attended + releasedEarly + releasedLate + noShows;
  const rate = (x: number) => (total === 0 ? null : Math.round((x / total) * 1000) / 10);
  return {
    total,
    attended,
    releasedEarly,
    releasedLate,
    noShows,
    showUpOrEarlyReleaseRate: rate(attended + releasedEarly),
    noShowRate: rate(noShows),
    lateReleaseRate: rate(releasedLate),
  };
}
