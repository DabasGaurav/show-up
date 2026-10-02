// "Who's coming" counts, and the one number on the admin page (spec §2.8, §2.11).
import type { BookingStatus } from "./types";

export interface WhoCounts {
  needed: number;
  /** Said yes. */
  coming: number;
  /** Has a spot but has not said yes yet. */
  notHeardBack: number;
  cantMakeIt: number;
  stillNeeded: number;
}

export function whoIsComing(needed: number, statuses: BookingStatus[]): WhoCounts {
  const n = (...s: BookingStatus[]) => statuses.filter((x) => s.includes(x)).length;
  const coming = n("confirmed");
  const notHeardBack = n("booked", "awaiting_confirmation");
  return {
    needed,
    coming,
    notHeardBack,
    cantMakeIt: n("released_early", "released_late"),
    stillNeeded: Math.max(0, needed - coming - notHeardBack),
  };
}

/** Spots left on an activity date. */
export function spotsLeft(needed: number, statuses: BookingStatus[]): number {
  const held = statuses.filter((s) => ["booked", "awaiting_confirmation", "confirmed", "attended", "no_show", "not_recorded"].includes(s)).length;
  return Math.max(0, needed - held);
}

export interface ShowUpRate {
  /** Past spots with a known ending. */
  spots: number;
  came: number;
  freedEarly: number;
  freedLate: number;
  didntCome: number;
  /** "Came or freed their spot early", as a % of all spots. Null with nothing to count. */
  rate: number | null;
}

export function showUpRate(pastStatuses: BookingStatus[]): ShowUpRate {
  const n = (s: BookingStatus) => pastStatuses.filter((x) => x === s).length;
  const came = n("attended");
  const freedEarly = n("released_early");
  const freedLate = n("released_late");
  const didntCome = n("no_show");
  const spots = came + freedEarly + freedLate + didntCome;
  return { spots, came, freedEarly, freedLate, didntCome, rate: spots === 0 ? null : Math.round(((came + freedEarly) / spots) * 1000) / 10 };
}
