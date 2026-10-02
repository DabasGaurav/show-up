// What people see for each status (Redesign brief B6, B10). Wording only: the
// rules that decide a status live in lib/rules.
import { isUnconfirmed } from "@/lib/rules/release";
import type { BookingFact, BookingStatus, ChipTone } from "@/lib/rules";

export interface Pill {
  label: string;
  tone: ChipTone;
}

/** A volunteer looking at their own spot. */
export function volunteerPill(status: BookingStatus): Pill {
  switch (status) {
    case "requested": return { label: "Asked to join", tone: "blue" };
    case "booked": return { label: "Saved", tone: "blue" };
    case "awaiting_confirmation": return { label: "Waiting for your yes", tone: "amber" };
    case "confirmed": return { label: "Confirmed", tone: "green" };
    case "released_early":
    case "released_late": return { label: "Freed", tone: "grey" };
    case "attended": return { label: "Came", tone: "green" };
    case "no_show": return { label: "Didn't come", tone: "red" };
    case "not_recorded": return { label: "Not marked", tone: "grey" };
    case "declined": return { label: "Not this time", tone: "grey" };
    case "auto_released": return { label: "No reply from the NGO", tone: "grey" };
  }
}

/** An NGO looking at the people on their activity. */
export function ngoPill(status: BookingStatus, startAt: Date, now: Date): Pill {
  switch (status) {
    case "requested": return { label: "Wants to join", tone: "blue" };
    // Saved a spot, and we have not checked in with them yet.
    case "booked":
      return isUnconfirmed(status, startAt, now) ? { label: "Not heard back", tone: "amber" } : { label: "Saved a spot", tone: "blue" };
    case "awaiting_confirmation": return { label: "Not heard back", tone: "amber" };
    case "confirmed": return { label: "Coming", tone: "green" };
    case "released_early":
    case "released_late": return { label: "Freed their spot", tone: "grey" };
    case "attended": return { label: "Came", tone: "green" };
    case "no_show": return { label: "Didn't come", tone: "red" };
    case "not_recorded": return { label: "Not marked", tone: "grey" };
    case "declined": return { label: "Not this time", tone: "grey" };
    case "auto_released": return { label: "No reply sent", tone: "grey" };
  }
}

export type Dot = "came" | "freed" | "missed";

export interface TrackRecord {
  /** Most recent last, at most 10. */
  dots: Dot[];
  came: number;
  total: number;
  text: string;
  empty: boolean;
}

/** Track record: "Came 7 of 7 times" with a row of dots (brief A4.3). */
export function trackRecord(facts: BookingFact[]): TrackRecord {
  const past = facts
    .filter((f) => ["attended", "no_show", "released_late", "released_early"].includes(f.status))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const came = past.filter((f) => f.status === "attended").length;
  const missed = past.filter((f) => f.status === "no_show").length;
  const late = past.filter((f) => f.status === "released_late").length;
  // Freeing a spot in good time does not count against anyone.
  const total = came + missed + late;
  const dots = past.slice(-10).map<Dot>((f) => (f.status === "attended" ? "came" : f.status === "no_show" ? "missed" : "freed"));
  const extras = [late ? `freed ${late} late` : "", missed ? `${missed} didn't come` : ""].filter(Boolean);
  return {
    dots,
    came,
    total,
    empty: total === 0,
    text: total === 0 ? "No history yet" : [`Came ${came} of ${total} ${total === 1 ? "time" : "times"}`, ...extras].join(" · "),
  };
}
