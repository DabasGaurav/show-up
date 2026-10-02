import { isAdmin } from "@/lib/auth";
import { now } from "@/lib/clock";
import { csvResponse, toCsv } from "@/lib/csv";
import { computeMetrics } from "@/lib/data/metrics";
import { query } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { reliabilityRecord, verifiedHours, type BookingStatus } from "@/lib/rules";

export const dynamic = "force-dynamic";

type Table = { headers: string[]; rows: unknown[][] };

const fromRows = (rows: Record<string, unknown>[], headers: string[]): Table => ({
  headers,
  rows: rows.map((r) => headers.map((h) => r[h])),
});

const EXPORTS: Record<string, () => Promise<Table | null>> = {
  // Every booking with its event, volunteer and source channel (§18).
  bookings: async () =>
    fromRows(
      await query(
        `select b.id as booking_id, o.name as organisation, o.type as organisation_type, t.title as task, t.cause, t.mode, t.city,
                oc.start_at, oc.end_at, t.slots_needed, u.id as volunteer_id, u.name as volunteer, u.phone, u.email,
                b.status, b.source, b.created_at as booked_at, b.confirmed_at, b.released_at, b.release_reason, b.decided_at,
                round((extract(epoch from (oc.start_at - b.released_at)) / 3600)::numeric, 1) as release_hours_before_start
         from bookings b
         join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
         join organisations o on o.id = t.org_id join users u on u.id = b.user_id
         order by oc.start_at, b.created_at`,
      ),
      ["booking_id", "organisation", "organisation_type", "task", "cause", "mode", "city", "start_at", "end_at", "slots_needed",
       "volunteer_id", "volunteer", "phone", "email", "status", "source", "booked_at", "confirmed_at", "released_at",
       "release_reason", "decided_at", "release_hours_before_start"],
    ),

  events: async () =>
    fromRows(
      await query("select created_at, name, user_id, session_id, props from events order by created_at"),
      ["created_at", "name", "user_id", "session_id", "props"],
    ),

  // The per-event table on the metrics page.
  "events-table": async () => {
    const m = await computeMetrics(await now());
    return {
      headers: ["event", "organisation", "start_at", "needed", "bookings", "attended", "released_early", "released_late", "no_show",
                "unmarked", "refilled", "ngo_chasing_minutes", "show_up_or_early_release_rate"],
      rows: [
        ...m.events.map((e) => [e.title, e.org_name, e.start_at, e.slots_needed, e.total, e.attended, e.releasedEarly, e.releasedLate,
                                e.noShows, e.notRecorded, e.refilled, e.chasingMinutes, e.showUpOrEarlyReleaseRate]),
        ["ALL EVENTS", `${m.ngoCount} NGOs`, "", "", m.overall.total, m.overall.attended, m.overall.releasedEarly, m.overall.releasedLate,
         m.overall.noShows, "", m.seatsRefilled, m.avgChasingMinutes, m.overall.showUpOrEarlyReleaseRate],
      ],
    };
  },

  // Verified hours and reliability record per volunteer (§18).
  volunteers: async () => {
    const users = await query<{ id: string; name: string; phone: string | null; city: string | null; level: string; id_status: string; created_at: Date }>(
      "select id, name, phone, city, level, id_status, created_at from users where role <> 'admin' order by name",
    );
    const facts = await query<{ user_id: string; status: BookingStatus; start_at: Date; duration_min: number }>(
      `select b.user_id, b.status, oc.start_at, t.duration_min from bookings b
       join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id`,
    );
    return {
      headers: ["volunteer_id", "name", "phone", "city", "level", "id_status", "member_since", "attended", "booked", "late_releases", "no_shows", "verified_hours"],
      rows: users.map((u) => {
        const f = facts.filter((x) => x.user_id === u.id).map((x) => ({ status: x.status, startAt: x.start_at, durationMin: x.duration_min }));
        const r = reliabilityRecord(f);
        return [u.id, u.name, u.phone, u.city, isEnabled("F8") ? u.level : "", isEnabled("F8") ? u.id_status : "", u.created_at,
                r.attended, r.booked, r.lateReleases, r.noShows, verifiedHours(f)];
      }),
    };
  },

  // Verified hours and turnout per organisation (§18).
  organisations: async () =>
    fromRows(
      await query(
        `select o.id as organisation_id, o.name, o.type, o.city, o.status, o.verified_at,
                count(distinct t.id)::int as tasks,
                count(b.id) filter (where b.status = 'attended')::int as attended,
                count(b.id) filter (where b.status = 'no_show')::int as no_shows,
                count(b.id) filter (where b.status = 'released_early')::int as released_early,
                count(b.id) filter (where b.status = 'released_late')::int as released_late,
                round((coalesce(sum(t.duration_min) filter (where b.status = 'attended'), 0) / 60.0)::numeric, 1) as verified_hours,
                count(distinct b.user_id) filter (where b.status = 'attended')::int as volunteers
         from organisations o
         left join tasks t on t.org_id = o.id
         left join task_occurrences oc on oc.task_id = t.id
         left join bookings b on b.occurrence_id = oc.id
         group by o.id order by o.name`,
      ),
      ["organisation_id", "name", "type", "city", "status", "verified_at", "tasks", "attended", "no_shows", "released_early",
       "released_late", "verified_hours", "volunteers"],
    ),
};

export async function GET(_req: Request, ctx: RouteContext<"/admin/export/[kind]">) {
  if (!(await isAdmin())) return new Response("Not authorised", { status: 401 });
  const { kind } = await ctx.params;
  const table = await EXPORTS[kind]?.();
  if (!table) return new Response("Not found", { status: 404 });
  return csvResponse(`showup-${kind}.csv`, toCsv(table.headers, table.rows));
}
