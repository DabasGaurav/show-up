import "server-only";
import { query } from "@/lib/db";
import { HOUR_MS, mvpMetrics, RULES, type BookingStatus, type MvpMetrics } from "@/lib/rules";

// MVP1 metrics (PRD §10). Everything is computed from bookings for occurrences
// that have already started; `not_recorded` bookings are excluded.

interface Row {
  booking_id: string;
  status: BookingStatus;
  source: string;
  created_at: Date;
  confirmed_at: Date | null;
  released_at: Date | null;
  occurrence_id: string;
  start_at: Date;
  task_id: string;
  title: string;
  org_id: string;
  org_name: string;
  slots_needed: number;
}

export interface EventMetrics extends MvpMetrics {
  occurrence_id: string;
  task_id: string;
  title: string;
  org_name: string;
  start_at: Date;
  slots_needed: number;
  notRecorded: number;
  refilled: number;
  chasingMinutes: number | null;
}

export interface Metrics {
  overall: MvpMetrics;
  events: EventMetrics[];
  perNgo: (MvpMetrics & { org_name: string; events: number })[];
  /** confirmed ÷ active, measured at T−24h. */
  confirmationRateAtT24: number | null;
  medianReleaseLeadHours: number | null;
  seatsReleased: number;
  seatsRefilled: number;
  avgChasingMinutes: number | null;
  ngoCount: number;
  target: number;
  baseline: number;
}

export const TARGET_RATE = 80;
export const BASELINE_RATE = 60;

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export async function computeMetrics(now: Date): Promise<Metrics> {
  const rows = await query<Row>(
    `select b.id as booking_id, b.status, b.source, b.created_at, b.confirmed_at, b.released_at,
            oc.id as occurrence_id, oc.start_at, t.id as task_id, t.title, o.id as org_id, o.name as org_name, t.slots_needed
     from bookings b
     join task_occurrences oc on oc.id = b.occurrence_id
     join tasks t on t.id = oc.task_id
     join organisations o on o.id = t.org_id
     where oc.start_at <= $1 and b.status not in ('requested','declined','auto_released')
     order by oc.start_at desc`,
    [now],
  );
  const chasing = new Map(
    (await query<{ key: string; value: number }>("select key, value from app_state where key like 'chasing_minutes:%'")).map(
      (r) => [r.key.split(":")[1], Number(r.value)],
    ),
  );

  const byEvent = new Map<string, Row[]>();
  for (const r of rows) byEvent.set(r.occurrence_id, [...(byEvent.get(r.occurrence_id) ?? []), r]);
  const events: EventMetrics[] = [...byEvent.values()].map((list) => ({
    ...mvpMetrics(list),
    occurrence_id: list[0].occurrence_id,
    task_id: list[0].task_id,
    title: list[0].title,
    org_name: list[0].org_name,
    start_at: list[0].start_at,
    slots_needed: list[0].slots_needed,
    notRecorded: list.filter((r) => r.status === "not_recorded" || ["booked", "awaiting_confirmation", "confirmed"].includes(r.status)).length,
    refilled: list.filter((r) => r.source === "admin" || r.source === "standby").length,
    chasingMinutes: chasing.get(list[0].occurrence_id) ?? null,
  }));

  const byNgo = new Map<string, Row[]>();
  for (const r of rows) byNgo.set(r.org_name, [...(byNgo.get(r.org_name) ?? []), r]);

  // Confirmation rate at T−24h: of the bookings still active at that moment, how many had confirmed.
  const t24 = (r: Row) => r.start_at.getTime() - RULES.freeReleaseHours * HOUR_MS;
  const activeAtT24 = rows.filter((r) => r.created_at.getTime() <= t24(r) && (r.released_at === null || r.released_at.getTime() > t24(r)));
  const confirmedAtT24 = activeAtT24.filter((r) => r.confirmed_at !== null && r.confirmed_at.getTime() <= t24(r));

  const released = rows.filter((r) => r.released_at !== null && (r.status === "released_early" || r.status === "released_late"));
  const reported = events.map((e) => e.chasingMinutes).filter((m): m is number => m !== null);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    overall: mvpMetrics(rows),
    events,
    perNgo: [...byNgo.entries()].map(([org_name, list]) => ({
      ...mvpMetrics(list),
      org_name,
      events: new Set(list.map((r) => r.occurrence_id)).size,
    })),
    confirmationRateAtT24: activeAtT24.length ? round1((confirmedAtT24.length / activeAtT24.length) * 100) : null,
    medianReleaseLeadHours: (() => {
      const m = median(released.map((r) => (r.start_at.getTime() - r.released_at!.getTime()) / HOUR_MS));
      return m === null ? null : round1(m);
    })(),
    seatsReleased: released.length,
    seatsRefilled: rows.filter((r) => r.source === "admin" || r.source === "standby").length,
    avgChasingMinutes: reported.length ? Math.round(reported.reduce((a, b) => a + b, 0) / reported.length) : null,
    ngoCount: byNgo.size,
    target: TARGET_RATE,
    baseline: BASELINE_RATE,
  };
}
