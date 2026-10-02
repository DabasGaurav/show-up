// §5.1 Trust levels, §5.6 no-show consequences, and the booking gate in §5.2.
import { DAY_MS, RULES } from "./config";
import type { BookingFact, IdStatus, MinTrust, TrustLevel } from "./types";

const RANK: Record<TrustLevel | MinTrust, number> = {
  everyone: 0,
  new: 0,
  verified: 1,
  trusted: 2,
};

const inWindow = (b: BookingFact, now: Date, days: number) =>
  b.startAt.getTime() > now.getTime() - days * DAY_MS && b.startAt.getTime() <= now.getTime();

/**
 * New: phone confirmed. Verified: ID checked. Trusted: Verified plus ≥3 attended
 * and 0 no-shows in the last 90 days. A no-show removes Trusted immediately; it
 * is regained after 3 further attended slots with no no-shows.
 */
export function trustLevel(
  idStatus: IdStatus,
  bookings: BookingFact[],
  now: Date,
  rules = RULES,
): TrustLevel {
  if (idStatus !== "approved") return "new";
  const recent = bookings
    .filter((b) => inWindow(b, now, rules.trustWindowDays))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  if (recent.some((b) => b.status === "no_show")) {
    const lastNoShow = recent.map((b) => b.status).lastIndexOf("no_show");
    const attendedSince = recent.slice(lastNoShow + 1).filter((b) => b.status === "attended").length;
    return attendedSince >= rules.trustedAttendedSlots ? "trusted" : "verified";
  }
  const attended = recent.filter((b) => b.status === "attended").length;
  return attended >= rules.trustedAttendedSlots ? "trusted" : "verified";
}

/** Progress shown on My profile, e.g. "2 of 3 attended slots to Trusted". */
export function progressToTrusted(
  bookings: BookingFact[],
  now: Date,
  rules = RULES,
): { attended: number; needed: number } {
  const recent = bookings
    .filter((b) => inWindow(b, now, rules.trustWindowDays))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const lastNoShow = recent.map((b) => b.status).lastIndexOf("no_show");
  const attended = recent.slice(lastNoShow + 1).filter((b) => b.status === "attended").length;
  return { attended: Math.min(attended, rules.trustedAttendedSlots), needed: rules.trustedAttendedSlots };
}

export function meetsMinTrust(level: TrustLevel, min: MinTrust): boolean {
  return RANK[level] >= RANK[min];
}

/**
 * Two no-shows in a rolling 90 days pause Verified-only and Trusted-only tasks
 * for 30 days from the second no-show. Returns when the pause ends, or null.
 */
export function pausedUntil(bookings: BookingFact[], now: Date, rules = RULES): Date | null {
  const noShows = bookings
    .filter((b) => b.status === "no_show" && b.startAt.getTime() <= now.getTime())
    .map((b) => b.startAt.getTime())
    .sort((a, b) => a - b);
  let until: number | null = null;
  for (let i = rules.noShowLimit - 1; i < noShows.length; i++) {
    const first = noShows[i - (rules.noShowLimit - 1)];
    if (noShows[i] - first <= rules.noShowWindowDays * DAY_MS) {
      until = noShows[i] + rules.pauseDays * DAY_MS;
    }
  }
  return until !== null && until > now.getTime() ? new Date(until) : null;
}

export type BookingBlock = "full" | "trust_level" | "paused" | "already_booked" | "started";

export interface CanBookInput {
  seatsLeft: number;
  minTrust: MinTrust;
  level: TrustLevel;
  pausedUntil: Date | null;
  alreadyBooked: boolean;
  startAt: Date;
  now: Date;
  /** MVP1 does not enforce trust levels or the pause (§5.6). */
  enforceTrust: boolean;
}

export function canBook(i: CanBookInput): { ok: true } | { ok: false; reason: BookingBlock } {
  if (i.now.getTime() >= i.startAt.getTime()) return { ok: false, reason: "started" };
  if (i.alreadyBooked) return { ok: false, reason: "already_booked" };
  if (i.seatsLeft <= 0) return { ok: false, reason: "full" };
  if (i.enforceTrust && i.minTrust !== "everyone") {
    if (i.pausedUntil) return { ok: false, reason: "paused" };
    if (!meetsMinTrust(i.level, i.minTrust)) return { ok: false, reason: "trust_level" };
  }
  return { ok: true };
}
