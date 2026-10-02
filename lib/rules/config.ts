// Policy values for every business rule in PRD §5. Change policies here, not in
// the rule functions (§18).

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const RULES = {
  confirmRequestHours: 48, // T−48h: ask for confirmation
  confirmReminderHours: 36, // T−36h: remind if unconfirmed
  freeReleaseHours: 24, // release before T−24h carries no penalty
  dayOfReminderHours: 3, // T−3h: day-of reminder
  attendanceWindowHours: 72, // unmarked after this → not_recorded
  trustedAttendedSlots: 3,
  trustWindowDays: 90,
  noShowLimit: 2,
  noShowWindowDays: 90,
  pauseDays: 30,
  standbyOfferHours: 2,
  responseHours: 48,
  responseWindowDays: 90,
  lapsedDays: 30,
  nudgeMaxTasks: 3,
  minReviewsToShowRating: 3,
  doneDefinitionMinChars: 20,
} as const;

export type Rules = typeof RULES;
