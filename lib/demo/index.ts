// Demo mode (Redesign brief, Part C). Sample data comes from a local JSON file;
// there is no backend and nothing is saved beyond the visitor's own browser.
import type { ActivityCardData } from "@/components/activity-card";
import type { TaskCardData } from "@/components/task-card";
import { fmtDayDate, fmtDuration, fmtTimeRange, istDateKey, istToDate } from "@/lib/format";
import data from "./data.json";

export interface DemoNgo {
  slug: string;
  name: string;
  city: string;
  cause: string;
  causeLabel?: string;
  checked: boolean;
  about: string;
  joined: string;
  reply: string;
  rating: number | null;
  ratings: number;
  reviews: string[];
  /** Added to make the SH2 comparison work; not one of the interviewed NGOs. */
  notFromResearch?: boolean;
}

interface RawActivity {
  slug: string;
  ngo: string;
  title: string;
  cause: string;
  role: string;
  done: string;
  mode: string;
  place: string;
  near: boolean;
  km: number | null;
  dow: number;
  start: string;
  minutes: number;
  regular: boolean;
  commitment: string;
  needed: number;
  left: number;
  contact: string;
  checkedOnly?: boolean;
  similar?: boolean;
  onlyInPick?: boolean;
}

export interface DemoActivity extends RawActivity {
  startAt: Date;
  endAt: Date;
  org: DemoNgo;
}

export interface DemoApplicant {
  id: string;
  name: string;
  level: "new" | "verified" | "trusted";
  came: number;
  of: number;
  dots: string;
  extra?: string;
  note: string;
  joined: string;
  paused?: string;
}

export const demoApplicants = data.applicants as DemoApplicant[];
export const demoReviews = data.reviews as Record<string, { by: string; cause: string; text: string }>;

export const DEMO = data;
export const demoNgos = data.ngos as DemoNgo[];
export const demoNgo = (slug: string) => demoNgos.find((n) => n.slug === slug);

/** The real time, read through a function so pages stay pure. */
export const demoNow = () => new Date();

/** The next time this weekday and hour comes round (at least 6 hours away). */
function nextOn(dow: number, time: string, now: Date): Date {
  for (let i = 0; i < 8; i++) {
    const day = new Date(now.getTime() + i * 864e5);
    const key = istDateKey(day);
    const at = istToDate(key, time);
    if (new Date(`${key}T12:00:00Z`).getUTCDay() === dow && at.getTime() > now.getTime() + 6 * 36e5) return at;
  }
  return now;
}

export function demoActivities(now: Date): DemoActivity[] {
  return (data.activities as RawActivity[])
    .map((a) => {
      const startAt = nextOn(a.dow, a.start, now);
      return { ...a, startAt, endAt: new Date(startAt.getTime() + a.minutes * 60000), org: demoNgo(a.ngo)! };
    })
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export const demoActivity = (slug: string, now: Date) => demoActivities(now).find((a) => a.slug === slug);

export function toCard(a: DemoActivity, saved = false): ActivityCardData {
  return {
    title: a.title, cause: a.cause, orgName: a.org.name, orgChecked: a.org.checked, start: a.startAt, end: a.endAt,
    durationMin: a.minutes, online: a.mode === "online",
    place: a.mode === "online" ? "Online" : a.km ? `${a.place} · ${a.km} km away` : a.place,
    needed: a.needed, taken: a.needed - a.left + (saved ? 1 : 0),
  };
}

export function toDetails(a: DemoActivity, saved: boolean): TaskCardData {
  return {
    title: a.title, cause: a.cause, orgName: a.org.name, orgVerified: a.org.checked,
    date: fmtDayDate(a.startAt), time: fmtTimeRange(a.startAt, a.endAt), duration: fmtDuration(a.minutes),
    mode: a.mode as "onsite" | "online", place: a.place, mapUrl: undefined,
    onlineLink: saved && a.mode === "online" ? "https://meet.example.org/show-up-demo" : null,
    role: a.role, done: a.done, commitment: a.commitment,
    contact: `${a.contact} · ${saved ? "+91 90000 00100" : "number shared once you're confirmed"}`,
    seatsLeft: Math.max(0, a.left - (saved ? 1 : 0)), slotsNeeded: a.needed,
    whoCanBook: a.checkedOnly ? "For volunteers whose ID we've checked" : "",
  };
}
