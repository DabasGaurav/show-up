import type { ActivityCardData } from "@/components/activity-card";
import type { ActivityDetailsData } from "@/components/activity-details";
import type { ActivityDate, ActivityWithOrg, Upcoming } from "@/lib/data/tasks";
import { fmtDayDate, fmtDuration, fmtPhone, fmtRepeats, fmtTimeRange, mapLink } from "@/lib/format";

const place = (a: { mode: string; address: string | null; city: string }) =>
  a.mode === "online" ? "Online" : [a.address, a.city].filter(Boolean).join(", ");

export function cardOf(a: Upcoming): ActivityCardData {
  return {
    title: a.title, cause: a.cause, orgName: a.org_name, orgChecked: a.org_checked, start: a.date_start, end: a.date_end,
    durationMin: a.duration_min, online: a.mode === "online", place: place(a), needed: a.slots_needed, taken: a.taken,
  };
}

/** Details for one date. `confirmed` reveals the link and the contact's phone. */
export function detailsOf(a: ActivityWithOrg, d: ActivityDate, confirmed: boolean): ActivityDetailsData {
  return {
    title: a.title, cause: a.cause, orgName: a.org_name, orgChecked: a.org_checked, orgHref: `/ngo/${a.org_slug}`,
    when: `${fmtDayDate(d.start_at)} · ${fmtTimeRange(d.start_at, d.end_at)}`,
    duration: fmtDuration(a.duration_min),
    online: a.mode === "online", place: place(a),
    mapUrl: a.mode === "onsite" ? mapLink(a.lat, a.lng, a.address) : undefined,
    onlineLink: confirmed ? a.online_link : null,
    role: a.role, done: a.done_definition, repeats: fmtRepeats(a.occurrences, a.start_at),
    contact: confirmed ? `${a.contact_name} · ${fmtPhone(a.contact_phone)}` : a.contact_name,
    needed: a.slots_needed, taken: d.taken,
  };
}

export const placeLine = place;
