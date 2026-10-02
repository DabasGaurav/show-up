// Explore filters. What's chosen lives in the address (/?cause=teaching&city=jaipur),
// so the cause pictures, the filter chips and a shared link always agree.
import { CAUSES, CITY_NAMES, urlSlug } from "@/lib/constants";

export interface Filters {
  /** A listed city, "other" (other places) or "online". Empty = everywhere. */
  city: string;
  causes: string[];
  /** "weekend" or YYYY-MM-DD. */
  date: string;
  len: string;
  kind: string;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = (v: string, allowed: readonly string[]) => allowed.find((a) => urlSlug(a) === urlSlug(v)) ?? "";

export function parseFilters(sp: Params): Filters {
  return {
    city: pick(one(sp.city), [...CITY_NAMES, "other", "online"]) || (one(sp.mode) === "online" ? "online" : ""),
    causes: one(sp.cause).split(",").map((c) => pick(c, CAUSES)).filter(Boolean),
    date: /^(weekend|\d{4}-\d{2}-\d{2})$/.test(one(sp.date)) ? one(sp.date) : "",
    len: pick(one(sp.len), ["short", "mid", "long"]),
    kind: pick(one(sp.kind), ["once", "repeats"]),
  };
}

export const filterCount = (f: Filters) => f.causes.length + [f.city, f.date, f.len, f.kind].filter(Boolean).length;

export function filterQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.causes.length) p.set("cause", f.causes.map(urlSlug).join(","));
  if (f.city) p.set("city", urlSlug(f.city));
  if (f.date) p.set("date", f.date);
  if (f.len) p.set("len", f.len);
  if (f.kind) p.set("kind", f.kind);
  return p.toString().replace(/%2C/g, ",");
}

/** The address for these filters with `patch` applied. `toResults` jumps to the list. */
export function filterHref(f: Filters, patch: Partial<Filters> = {}, toResults = false): string {
  const q = filterQuery({ ...f, ...patch });
  return `/${q ? `?${q}` : ""}${toResults ? "#results" : ""}`;
}

/** Tap a cause to add it; tap it again to clear it. */
export const toggleCause = (f: Filters, cause: string): Partial<Filters> => ({
  causes: f.causes.includes(cause) ? f.causes.filter((c) => c !== cause) : [...f.causes, cause],
});
