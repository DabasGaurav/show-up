// Shared option lists. Safe to import from client components.

export const CAUSES = ["Teaching", "Food", "Trees & green", "Animals", "Health", "Elders", "Skills"] as const;
export type Cause = (typeof CAUSES)[number];

/** Chip colour for each cause. */
export const CAUSE_COLOR: Record<string, string> = {
  Teaching: "var(--cause-teaching)",
  Food: "var(--cause-food)",
  "Trees & green": "var(--cause-green)",
  Animals: "var(--cause-animals)",
  Health: "var(--cause-health)",
  Elders: "var(--cause-elderly)",
  Skills: "var(--cause-skills)",
};
export const causeColor = (cause: string) => CAUSE_COLOR[cause] ?? "var(--primary-soft)";

export const ONLINE = "Online";

// City centres are where the map pin starts when an NGO posts an activity.
export const CITIES: Record<string, { lat: number; lng: number }> = {
  "Delhi NCR": { lat: 28.6139, lng: 77.209 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
};
export const CITY_NAMES = Object.keys(CITIES);

export const REASONS = ["work", "health", "travel", "other"] as const;
export type Reason = (typeof REASONS)[number];
export const REASON_LABEL: Record<Reason, string> = {
  work: "Work",
  health: "Not well",
  travel: "Travelling",
  other: "Other",
};
/** How a reason reads inside a sentence: "(work came up)". */
export const REASON_PHRASE: Record<Reason, string> = {
  work: "work came up",
  health: "not well",
  travel: "travelling",
  other: "something came up",
};
