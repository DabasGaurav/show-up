export type TrustLevel = "new" | "verified" | "trusted";
export type MinTrust = "everyone" | "verified" | "trusted";
export type IdStatus = "none" | "pending" | "approved" | "rejected";

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

/** Holds a seat on the task. */
export const ACTIVE_STATUSES: BookingStatus[] = [
  "booked",
  "awaiting_confirmation",
  "confirmed",
];

/** Holds or held a seat (active, or resolved after the slot). */
export const SEAT_STATUSES: BookingStatus[] = [
  ...ACTIVE_STATUSES,
  "attended",
  "no_show",
  "not_recorded",
];

export const RELEASED_STATUSES: BookingStatus[] = [
  "released_early",
  "released_late",
];

/** The minimum a rule needs to know about a past booking. */
export interface BookingFact {
  status: BookingStatus;
  /** Start of the slot the booking was for. */
  startAt: Date;
  durationMin?: number;
}
