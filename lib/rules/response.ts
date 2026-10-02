// §5.8 Guaranteed response, §5.9 re-engagement nudges, §5.10 rating display.
import { DAY_MS, HOUR_MS, RULES } from "./config";

export interface RequestFact {
  createdAt: Date;
  /** When the NGO accepted or declined; null if never answered. */
  decidedAt: Date | null;
}

/** The NGO must accept or decline within 48h, otherwise the request auto-releases. */
export function responseDeadline(createdAt: Date, rules = RULES): Date {
  return new Date(createdAt.getTime() + rules.responseHours * HOUR_MS);
}

export function shouldAutoRelease(req: RequestFact, now: Date, rules = RULES): boolean {
  return req.decidedAt === null && now.getTime() > responseDeadline(req.createdAt, rules).getTime();
}

/**
 * % of requests answered within 48h over the last 90 days. Requests still inside
 * their 48h window are not counted yet. Null when there is nothing to measure.
 */
export function responseRate(requests: RequestFact[], now: Date, rules = RULES): number | null {
  const due = requests
    .filter((r) => r.createdAt.getTime() > now.getTime() - rules.responseWindowDays * DAY_MS)
    .filter((r) => r.decidedAt !== null || now.getTime() > responseDeadline(r.createdAt, rules).getTime());
  if (due.length === 0) return null;
  const inTime = due.filter(
    (r) => r.decidedAt !== null && r.decidedAt.getTime() <= responseDeadline(r.createdAt, rules).getTime(),
  ).length;
  return Math.round((inTime / due.length) * 100);
}

/** Lapsed = no booking for 30 days. */
export function isLapsed(lastBookingAt: Date | null, now: Date, rules = RULES): boolean {
  if (lastBookingAt === null) return true;
  return now.getTime() - lastBookingAt.getTime() >= rules.lapsedDays * DAY_MS;
}

export interface NudgeTask {
  id: string;
  orgId: string;
  cause: string;
  mode: "onsite" | "online";
  city: string;
  startAt: Date;
}

/** Up to 3 upcoming tasks matching saved causes in the current city or online,
 *  NGOs the volunteer attended before first. */
export function nudgeTasks<T extends NudgeTask>(
  tasks: T[],
  volunteer: { city: string | null; savedCauses: string[]; attendedOrgIds: string[] },
  now: Date,
  rules = RULES,
): T[] {
  return tasks
    .filter((t) => t.startAt.getTime() > now.getTime())
    .filter((t) => t.mode === "online" || t.city === volunteer.city)
    .filter((t) => volunteer.savedCauses.length === 0 || volunteer.savedCauses.includes(t.cause))
    .sort((a, b) => {
      const pa = volunteer.attendedOrgIds.includes(a.orgId) ? 0 : 1;
      const pb = volunteer.attendedOrgIds.includes(b.orgId) ? 0 : 1;
      return pa - pb || a.startAt.getTime() - b.startAt.getTime();
    })
    .slice(0, rules.nudgeMaxTasks);
}

/** Average rating is shown only after ≥3 reviews. */
export function displayRating(scores: number[], rules = RULES): { average: number; count: number } | null {
  if (scores.length < rules.minReviewsToShowRating) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { average: Math.round(avg * 10) / 10, count: scores.length };
}
