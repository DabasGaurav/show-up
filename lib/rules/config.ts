// The numbers behind every rule in the spec (§3). Change them here, not in the rules.

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const RULES = {
  /** "Still on?" goes out 2 days before. */
  checkInHours: 48,
  /** One gentle reminder 1.5 days before, if there is no reply. */
  reminderHours: 36,
  /** Freeing a spot at least this long before the start leaves nothing on the record. */
  freeHours: 24,
  /** The NGO can mark who came from the start until 3 days after. */
  markDays: 3,
  /** "Come back" email after this many days without saving a spot, and no more often. */
  comeBackDays: 30,
  comeBackActivities: 3,
} as const;
