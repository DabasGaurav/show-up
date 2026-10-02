export type BookingStatus =
  | "requested"
  | "booked"
  | "awaiting_confirmation"
  | "confirmed"
  | "released_early"
  | "released_late"
  | "attended"
  | "no_show"
  | "not_recorded"
  | "declined"
  | "auto_released";

/** Still holding a spot before the day. */
export const ACTIVE: BookingStatus[] = ["booked", "awaiting_confirmation", "confirmed"];
/** Holding, or held, a spot (counts against the number needed). */
export const HOLDING: BookingStatus[] = [...ACTIVE, "attended", "no_show", "not_recorded"];
export const FREED: BookingStatus[] = ["released_early", "released_late"];

/** What a rule needs to know about one of a person's spots. */
export interface SpotFact {
  status: BookingStatus;
  startAt: Date;
}

export type Tone = "green" | "amber" | "grey" | "red" | "teal";
