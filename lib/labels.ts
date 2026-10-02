// The words people see for each status. The rules that decide a status are in lib/rules.
import type { BookingStatus, Tone } from "@/lib/rules";

export interface Pill {
  label: string;
  tone: Tone;
}

/** A volunteer looking at their own plans: Saved, Waiting for your yes, Confirmed, Freed, Came, Didn't come. */
export function volunteerPill(status: BookingStatus): Pill {
  switch (status) {
    case "booked": return { label: "Saved", tone: "teal" };
    case "awaiting_confirmation": return { label: "Waiting for your yes", tone: "amber" };
    case "confirmed": return { label: "Confirmed", tone: "green" };
    case "released_early":
    case "released_late": return { label: "Freed", tone: "grey" };
    case "attended": return { label: "Came", tone: "green" };
    case "no_show": return { label: "Didn't come", tone: "red" };
    default: return { label: "Not marked", tone: "grey" };
  }
}

/** An NGO looking at the people on their activity. */
export function ngoPill(status: BookingStatus): Pill {
  switch (status) {
    case "confirmed": return { label: "Coming", tone: "green" };
    case "booked":
    case "awaiting_confirmation": return { label: "Not heard back", tone: "amber" };
    case "released_early":
    case "released_late": return { label: "Can't make it", tone: "grey" };
    case "attended": return { label: "Came", tone: "green" };
    case "no_show": return { label: "Didn't come", tone: "red" };
    default: return { label: "Not marked", tone: "grey" };
  }
}
