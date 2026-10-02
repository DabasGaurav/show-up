// Track record (spec §3): "Came X of Y times", plus late frees and didn't-comes.
import type { SpotFact } from "./types";

export type Dot = "came" | "freed" | "missed";

export interface TrackRecord {
  came: number;
  /** Past spots that were not freed early. */
  total: number;
  freedLate: number;
  didntCome: number;
  /** Most recent last, at most 10. */
  dots: Dot[];
  text: string;
  empty: boolean;
}

export function trackRecord(facts: SpotFact[]): TrackRecord {
  const past = facts
    .filter((f) => f.status === "attended" || f.status === "no_show" || f.status === "released_late")
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const came = past.filter((f) => f.status === "attended").length;
  const didntCome = past.filter((f) => f.status === "no_show").length;
  const freedLate = past.filter((f) => f.status === "released_late").length;
  const total = past.length;
  const extras = [freedLate ? `freed ${freedLate} late` : "", didntCome ? `${didntCome} didn't come` : ""].filter(Boolean);
  return {
    came,
    total,
    freedLate,
    didntCome,
    dots: past.slice(-10).map((f) => (f.status === "attended" ? "came" : f.status === "no_show" ? "missed" : "freed")),
    empty: total === 0,
    text: total === 0 ? "No history yet" : [`Came ${came} of ${total} ${total === 1 ? "time" : "times"}`, ...extras].join(" · "),
  };
}
