import "server-only";
import { CITIES, ONLINE } from "@/lib/constants";
import { query } from "@/lib/db";
import { haversineKm, istDateKey, istHour, weekendDays } from "@/lib/format";
import { meetsMinTrust, type MinTrust, type TrustLevel } from "@/lib/rules";

/** One row per task: its next upcoming session. */
export interface FeedItem {
  task_id: string;
  occurrence_id: string;
  share_slug: string;
  title: string;
  cause: string;
  role: string;
  mode: "onsite" | "online";
  city: string;
  lat: number | null;
  lng: number | null;
  start_at: Date;
  end_at: Date;
  duration_min: number;
  commitment: "one_off" | "recurring";
  recurrence_rule: string | null;
  occurrences: number;
  slots_needed: number;
  seats_taken: number;
  min_trust: MinTrust;
  booking_mode: "instant" | "approval";
  org_id: string;
  org_name: string;
  org_verified_at: Date | null;
  /** Distance from the selected city's centre; null for online tasks. */
  distance_km: number | null;
}

export async function listFeed(now: Date): Promise<FeedItem[]> {
  return query<FeedItem>(
    `select distinct on (t.id)
            t.id as task_id, oc.id as occurrence_id, t.share_slug, t.title, t.cause, t.role, t.mode, t.city, t.lat, t.lng,
            oc.start_at, oc.end_at, t.duration_min, t.commitment, t.recurrence_rule, t.occurrences, t.slots_needed,
            (select count(*)::int from bookings b where b.occurrence_id = oc.id
               and b.status in ('booked','awaiting_confirmation','confirmed')) as seats_taken,
            t.min_trust, t.booking_mode, o.id as org_id, o.name as org_name, o.verified_at as org_verified_at,
            null::float as distance_km
     from tasks t
     join organisations o on o.id = t.org_id and o.status = 'approved'
     join task_occurrences oc on oc.task_id = t.id and oc.start_at > $1
     where t.status = 'published'
     order by t.id, oc.start_at`,
    [now],
  );
}

export interface FeedFilters {
  city: string; // a city name, or "Online"
  q: string;
  causes: string[];
  mode: "" | "onsite" | "online";
  dist: "" | "2" | "5" | "10";
  date: string; // "", "today", "weekend" or YYYY-MM-DD
  tod: "" | "morning" | "afternoon" | "evening";
  dur: "" | "short" | "medium" | "long";
  commit: "" | "one_off" | "recurring";
  open: "" | "everyone" | "verified" | "trusted";
  /** Preset list of task ids (Test Lab SH2). */
  ids: string[];
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const many = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((x) => x.trim()).filter(Boolean);
const oneOf = <T extends string>(v: string, allowed: readonly T[]): T | "" => ((allowed as readonly string[]).includes(v) ? (v as T) : "");

export function parseFilters(sp: Record<string, string | string[] | undefined>, defaultCity: string): FeedFilters {
  const city = one(sp.city);
  return {
    city: city === ONLINE || city in CITIES ? city : defaultCity,
    q: one(sp.q).slice(0, 60),
    causes: many(sp.cause),
    mode: oneOf(one(sp.mode), ["onsite", "online"] as const),
    dist: oneOf(one(sp.dist), ["2", "5", "10"] as const),
    date: /^(today|weekend|\d{4}-\d{2}-\d{2})$/.test(one(sp.date)) ? one(sp.date) : "",
    tod: oneOf(one(sp.tod), ["morning", "afternoon", "evening"] as const),
    dur: oneOf(one(sp.dur), ["short", "medium", "long"] as const),
    commit: oneOf(one(sp.commit), ["one_off", "recurring"] as const),
    open: oneOf(one(sp.open), ["everyone", "verified", "trusted"] as const),
    ids: many(sp.ids),
  };
}

/** Number of filters the volunteer has switched on (city is always set). */
export function activeFilterCount(f: FeedFilters): number {
  return [f.q, f.mode, f.dist, f.date, f.tod, f.dur, f.commit, f.open].filter(Boolean).length + f.causes.length;
}

export function applyFilters(items: FeedItem[], f: FeedFilters, now: Date): FeedItem[] {
  const centre = CITIES[f.city];
  const [sat, sun] = weekendDays(now);
  const weekend = new Set([istDateKey(sat), istDateKey(sun)]);
  const q = f.q.toLowerCase();

  return items
    .map((t) => ({
      ...t,
      distance_km:
        t.mode === "onsite" && centre && t.lat !== null && t.lng !== null && t.city === f.city
          ? Math.round(haversineKm(centre, { lat: t.lat, lng: t.lng }) * 10) / 10
          : null,
    }))
    .filter((t) => {
      if (f.ids.length > 0) return f.ids.includes(t.task_id);
      // A city shows its on-site tasks plus everything online; "Online" shows online only.
      if (f.city === ONLINE ? t.mode !== "online" : t.mode === "onsite" && t.city !== f.city) return false;
      if (f.mode && t.mode !== f.mode) return false;
      if (q && !`${t.title} ${t.role} ${t.org_name} ${t.cause}`.toLowerCase().includes(q)) return false;
      if (f.causes.length > 0 && !f.causes.includes(t.cause)) return false;
      // Distance applies to on-site tasks only.
      if (f.dist && t.mode === "onsite" && (t.distance_km === null || t.distance_km > Number(f.dist))) return false;
      const day = istDateKey(t.start_at);
      if (f.date === "today" && day !== istDateKey(now)) return false;
      if (f.date === "weekend" && !weekend.has(day)) return false;
      if (/^\d{4}/.test(f.date) && day !== f.date) return false;
      const h = istHour(t.start_at);
      if (f.tod === "morning" && h >= 12) return false;
      if (f.tod === "afternoon" && (h < 12 || h >= 17)) return false;
      if (f.tod === "evening" && h < 17) return false;
      if (f.dur === "short" && t.duration_min > 120) return false;
      if (f.dur === "medium" && (t.duration_min <= 120 || t.duration_min > 240)) return false;
      if (f.dur === "long" && t.duration_min <= 240) return false;
      if (f.commit && t.commitment !== f.commit) return false;
      if (f.open && t.min_trust !== f.open) return false;
      return true;
    })
    .sort((a, b) => a.start_at.getTime() - b.start_at.getTime());
}

export const isLocked = (level: TrustLevel, t: Pick<FeedItem, "min_trust">) => !meetsMinTrust(level, t.min_trust);
