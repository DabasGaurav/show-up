// Shared option lists (PRD §6.1 Screen 2). Safe to import from client components.

export const CAUSES = [
  "Teaching",
  "Plantation",
  "Food distribution",
  "Animal welfare",
  "Health camps",
  "Elderly care",
  "Disaster relief",
  "Skill-based",
] as const;
export type Cause = (typeof CAUSES)[number];

export const ONLINE = "Online";

// Multi-city from day one (§18). Centres are used for the map pin and distance.
export const CITIES: Record<string, { lat: number; lng: number }> = {
  "Delhi NCR": { lat: 28.6139, lng: 77.209 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
};
export const CITY_NAMES = Object.keys(CITIES);

export const RECURRENCE = {
  daily: { label: "Every day", days: 1 },
  weekly: { label: "Every week", days: 7 },
  fortnightly: { label: "Every 2 weeks", days: 14 },
} as const;
export type RecurrenceRule = keyof typeof RECURRENCE;

export const RELEASE_REASONS = ["work", "health", "travel", "other"] as const;
export type ReleaseReason = (typeof RELEASE_REASONS)[number];

export const MIN_TRUST_LABEL = {
  everyone: "Everyone",
  verified: "Verified volunteers",
  trusted: "Trusted volunteers",
} as const;
