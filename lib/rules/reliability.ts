// §5.5 Reliability record, plus streak and verified hours (F16).
import type { BookingFact } from "./types";

export interface ReliabilityRecord {
  attended: number;
  /** Past bookings that were not early-released. */
  booked: number;
  lateReleases: number;
  noShows: number;
}

export function reliabilityRecord(bookings: BookingFact[]): ReliabilityRecord {
  const count = (s: BookingFact["status"]) => bookings.filter((b) => b.status === s).length;
  const attended = count("attended");
  const lateReleases = count("released_late");
  const noShows = count("no_show");
  return { attended, booked: attended + lateReleases + noShows, lateReleases, noShows };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** e.g. `Attended 7 of 8 booked slots · 1 late release · 0 no-shows` */
export function reliabilityString(r: ReliabilityRecord): string {
  if (r.booked === 0) return "No slots yet";
  return [
    `Attended ${r.attended} of ${plural(r.booked, "booked slot", "booked slots")}`,
    plural(r.lateReleases, "late release", "late releases"),
    plural(r.noShows, "no-show", "no-shows"),
  ].join(" · ");
}

/** Commitments kept in a row, most recent first. An early release keeps the streak. */
export function keptStreak(bookings: BookingFact[]): number {
  const resolved = bookings
    .filter((b) => ["attended", "no_show", "released_late", "released_early"].includes(b.status))
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  let streak = 0;
  for (const b of resolved) {
    if (b.status === "no_show" || b.status === "released_late") break;
    streak++;
  }
  return streak;
}

/** An attended booking adds verified hours equal to the slot duration (§5.4). */
export function verifiedHours(bookings: BookingFact[], sinceYear?: number): number {
  const minutes = bookings
    .filter((b) => b.status === "attended")
    .filter((b) => sinceYear === undefined || b.startAt.getFullYear() === sinceYear)
    .reduce((sum, b) => sum + (b.durationMin ?? 0), 0);
  return Math.round((minutes / 60) * 10) / 10;
}
