// §5.7 Standby cover.
import { HOUR_MS, RULES } from "./config";
import { meetsMinTrust } from "./trust";
import type { MinTrust, TrustLevel } from "./types";

export interface StandbyCandidate {
  userId: string;
  level: TrustLevel;
  city: string | null;
  isOnline: boolean;
  causes: string[];
  /** Already holds a booking that overlaps the released slot. */
  busy: boolean;
  /** When they switched standby on; earlier wins ties. */
  since?: Date;
}

export interface ReleasedSeat {
  mode: "onsite" | "online";
  city: string;
  cause: string;
  minTrust: MinTrust;
}

const ORDER: Record<TrustLevel, number> = { trusted: 0, verified: 1, new: 2 };

/** Matching standby volunteers, Trusted first, then Verified, then New. */
export function standbyQueue(seat: ReleasedSeat, candidates: StandbyCandidate[]): StandbyCandidate[] {
  return candidates
    .filter((c) => !c.busy)
    .filter((c) => (seat.mode === "online" ? c.isOnline : c.city === seat.city))
    .filter((c) => c.causes.length === 0 || c.causes.includes(seat.cause))
    .filter((c) => meetsMinTrust(c.level, seat.minTrust))
    .sort(
      (a, b) =>
        ORDER[a.level] - ORDER[b.level] ||
        (a.since?.getTime() ?? 0) - (b.since?.getTime() ?? 0),
    );
}

/** An offer lasts 2 hours, or until the task starts if that's sooner. */
export function offerExpiry(sentAt: Date, startAt: Date, rules = RULES): Date {
  return new Date(Math.min(sentAt.getTime() + rules.standbyOfferHours * HOUR_MS, startAt.getTime()));
}
