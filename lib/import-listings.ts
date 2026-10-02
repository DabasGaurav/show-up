import "server-only";
import { randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { istToDate } from "@/lib/format";
import { DAY_MS } from "@/lib/rules";

// Loads the launch listings (data/listings.json). Everything it writes is marked
// is_seed, is matched by a stable key so a second run changes nothing, and uses
// @showup.test addresses, which the email sender refuses to write to.

interface ListedActivity {
  key: string; title: string; cause: string; mode: "onsite" | "online"; address?: string; date: string; start: string; end: string;
  repeats_weekly: number; spots: number; what_you_do: string; done_when: string; past?: boolean;
}
interface ListedNgo {
  key: string; name: string; name_confirmed: boolean; interview_id?: string; city: string; city_other?: string; causes: string[]; about: string;
  coordinator: { name: string; role: string }; activities: ListedActivity[];
}
interface ListedBooking { ngo: string; activity: string; occurrence: number; status: "saved" | "confirmed" | "freed_early" | "came"; reason?: string | null }
interface ListedPerson { name: string; interview_id?: string; email: string; city: string; town?: string | null; causes: string[]; bookings: ListedBooking[] }
export interface Listings { ngos: ListedNgo[]; volunteers?: ListedPerson[]; team_volunteers?: ListedPerson[]; persona_volunteers?: ListedPerson[] }

export interface Tally { created: number; updated: number; unchanged: number }
export interface ImportReport {
  dryRun: boolean;
  ngos: Tally; activities: Tally; volunteers: Tally; spots: Tally;
  /** One line per record that was (or would be) created or changed. */
  changes: string[];
  /** Things still to confirm before presenting. */
  warnings: string[];
}

const tally = (): Tally => ({ created: 0, updated: 0, unchanged: 0 });
const PLACEHOLDER_LINK = "https://meet.google.com/";
const STATUS = { saved: "booked", confirmed: "confirmed", freed_early: "released_early", came: "attended" } as const;

function reasonKey(reason: string | null | undefined): string | null {
  if (!reason) return null;
  if (/work/i.test(reason)) return "work";
  if (/travel/i.test(reason)) return "travel";
  if (/well|health|sick|ill/i.test(reason)) return "health";
  return "other";
}

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) return a != null && b != null && new Date(a as Date).getTime() === new Date(b as Date).getTime();
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  return (a ?? null) === (b ?? null);
}

export async function importListings(data: Listings, opts: { dryRun: boolean; assumeEmpty?: boolean }): Promise<ImportReport> {
  const report: ImportReport = { dryRun: opts.dryRun, ngos: tally(), activities: tally(), volunteers: tally(), spots: tally(), changes: [], warnings: [] };
  const write = !opts.dryRun;

  /**
   * Create the row, or bring it in line with `fields`. Returns its id, or null when
   * a dry run would have created it. Table and column names come from this file only.
   */
  async function upsert(table: string, keyCol: string, keyVal: string, fields: Record<string, unknown>, t: Tally, label: string, onInsert: Record<string, unknown> = {}): Promise<string | null> {
    const existing = opts.assumeEmpty ? null : await queryOne<Record<string, unknown>>(`select * from ${table} where ${keyCol} = $1`, [keyVal]);
    if (!existing) {
      t.created++;
      report.changes.push(`+ ${label}`);
      if (!write) return null;
      const all = { [keyCol]: keyVal, ...fields, ...onInsert };
      const cols = Object.keys(all);
      const [row] = await query<{ id: string }>(
        `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
        Object.values(all),
      );
      return row.id;
    }
    const diff = Object.keys(fields).filter((k) => !same(existing[k], fields[k]));
    if (diff.length === 0) t.unchanged++;
    else {
      t.updated++;
      report.changes.push(`~ ${label} (${diff.join(", ")})`);
      if (write) {
        await query(`update ${table} set ${diff.map((k, i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [existing.id, ...diff.map((k) => fields[k])]);
      }
    }
    return existing.id as string;
  }

  /** Activity slug → the ids of its dates, in order. */
  const datesOf = new Map<string, string[]>();

  for (const n of data.ngos) {
    const city = n.city === "Other" ? (n.city_other ?? "Other") : n.city;
    if (!n.name_confirmed) report.warnings.push(`NGO name to confirm: "${n.name}" (${n.key})`);

    const ownerId = await upsert("users", "email", `${n.key}@showup.test`,
      { name: n.coordinator.name, role: "ngo_member", city, is_seed: true }, tally(), `coordinator ${n.coordinator.name} (${n.key})`);
    const orgId = await upsert("organisations", "import_key", n.key,
      { name: n.name, city, causes: n.causes, about: n.about, contact_name: n.coordinator.name, status: "approved", interview_id: n.interview_id ?? null, is_seed: true },
      report.ngos, `NGO ${n.name}`, { slug: n.key, verified_at: new Date() });
    if (write && orgId && ownerId) {
      await query("update organisations set verified_at = coalesce(verified_at, now()) where id = $1", [orgId]);
      await query("insert into org_members (org_id, user_id, role) values ($1, $2, 'owner') on conflict do nothing", [orgId, ownerId]);
      await query("insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value", [`org_role:${orgId}`, JSON.stringify(n.coordinator.role)]);
    }

    for (const a of n.activities) {
      const slug = `${n.key}-${a.key}`;
      const start = istToDate(a.date, a.start);
      const end = istToDate(a.date, a.end);
      const times = Math.max(1, a.repeats_weekly);
      const online = a.mode === "online";
      const before = report.activities.updated + report.activities.created;
      const taskId = await upsert("tasks", "share_slug", slug, {
        ...(orgId ? { org_id: orgId } : {}),
        title: a.title, cause: a.cause, role: a.what_you_do, done_definition: a.done_when, mode: a.mode, city,
        address: online ? null : (a.address ?? null), online_link: online ? PLACEHOLDER_LINK : null,
        start_at: start, end_at: end, duration_min: Math.round((end.getTime() - start.getTime()) / 60000),
        commitment: times > 1 ? "recurring" : "one_off", recurrence_rule: times > 1 ? "weekly" : null, occurrences: times,
        slots_needed: a.spots, contact_name: n.coordinator.name, contact_role: n.coordinator.role, status: "published", is_seed: true,
      }, report.activities, `activity ${a.title} (${slug})`, { contact_phone: "" });

      if (!taskId) continue;
      const existing = await query<{ id: string; start_at: Date; end_at: Date }>("select id, start_at, end_at from task_occurrences where task_id = $1 order by start_at", [taskId]);
      const ids: string[] = [];
      let moved = false;
      for (let i = 0; i < times; i++) {
        const s = new Date(start.getTime() + i * 7 * DAY_MS);
        const e = new Date(end.getTime() + i * 7 * DAY_MS);
        const row = existing[i];
        if (!row) {
          moved = true;
          if (write) ids.push((await query<{ id: string }>("insert into task_occurrences (task_id, start_at, end_at, is_seed) values ($1, $2, $3, true) returning id", [taskId, s, e]))[0].id);
        } else {
          ids.push(row.id);
          if (!same(row.start_at, s) || !same(row.end_at, e)) {
            moved = true;
            if (write) await query("update task_occurrences set start_at = $2, end_at = $3 where id = $1", [row.id, s, e]);
          }
        }
      }
      // Dates beyond the new count go, unless someone holds a spot on them.
      for (const row of existing.slice(times)) {
        if (await queryOne("select 1 as held from bookings where occurrence_id = $1", [row.id])) continue;
        moved = true;
        if (write) await query("delete from task_occurrences where id = $1", [row.id]);
      }
      if (moved && report.activities.updated + report.activities.created === before) {
        report.activities.unchanged--;
        report.activities.updated++;
        report.changes.push(`~ dates of ${a.title} (${slug})`);
      }
      datesOf.set(slug, ids);
    }
  }

  const people = [...(data.volunteers ?? []), ...(data.team_volunteers ?? []), ...(data.persona_volunteers ?? [])];
  for (const p of people) {
    const city = p.city === "Other" ? (p.town ?? "Other") : p.city;
    const userId = await upsert("users", "email", p.email.toLowerCase(),
      { name: p.name, city, saved_causes: p.causes, interview_id: p.interview_id ?? null, is_seed: true }, report.volunteers, `volunteer ${p.name}`);

    for (const b of p.bookings ?? []) {
      const slug = `${b.ngo}-${b.activity}`;
      const label = `spot: ${p.name} on ${slug} #${b.occurrence} (${b.status})`;
      const dateId = datesOf.get(slug)?.[b.occurrence - 1];
      if (!data.ngos.some((n) => n.key === b.ngo && n.activities.some((a) => a.key === b.activity))) {
        report.warnings.push(`Spot skipped, no such activity: ${label}`);
        continue;
      }
      const status = STATUS[b.status];
      const reason = reasonKey(b.reason);
      const existing = userId && dateId
        ? await queryOne<{ id: string; status: string; release_reason: string | null }>(
            "select id, status, release_reason from bookings where user_id = $1 and occurrence_id = $2 order by created_at desc limit 1", [userId, dateId])
        : null;
      if (!existing) {
        report.spots.created++;
        report.changes.push(`+ ${label}`);
        if (write && userId && dateId) {
          const at = new Date();
          await query(
            `insert into bookings (occurrence_id, user_id, status, source, confirm_token, confirmed_at, released_at, release_reason, is_seed)
             values ($1, $2, $3, 'admin', $4, $5, $6, $7, true)`,
            [dateId, userId, status, randomBytes(18).toString("base64url"),
              status === "confirmed" || status === "attended" ? at : null, status === "released_early" ? at : null, reason],
          );
        }
        continue;
      }
      // A saved spot the site has since moved on ("waiting for a yes", confirmed) is left alone.
      const movedOn = status === "booked" && ["awaiting_confirmation", "confirmed"].includes(existing.status);
      if ((existing.status === status || movedOn) && same(existing.release_reason, reason)) report.spots.unchanged++;
      else {
        report.spots.updated++;
        report.changes.push(`~ ${label}`);
        if (write) await query("update bookings set status = $2, release_reason = $3 where id = $1", [existing.id, status, reason]);
      }
    }
  }

  // Anything still marked as to be confirmed.
  const scan = (v: unknown, path: string) => {
    if (typeof v === "string" && /CONFIRM/.test(v)) report.warnings.push(`Still to confirm: ${path} = "${v}"`);
    else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) scan(x, `${path}.${k}`);
  };
  for (const n of data.ngos) scan(n, n.key);

  return report;
}

export function printReport(r: ImportReport): string {
  const line = (name: string, t: Tally) => `  ${name.padEnd(11)} ${String(t.created + t.updated + t.unchanged).padStart(3)} total · ${t.created} new · ${t.updated} changed · ${t.unchanged} unchanged`;
  return [
    r.dryRun ? "DRY RUN: nothing was written. This is what would change:" : "Done.",
    ...r.changes.map((c) => `  ${c}`),
    r.changes.length === 0 ? "  (no changes)" : "",
    "Summary",
    line("NGOs", r.ngos), line("Activities", r.activities), line("Volunteers", r.volunteers), line("Spots", r.spots),
    r.warnings.length ? "\nStill to confirm before presenting:" : "\nNothing left to confirm.",
    ...r.warnings.map((w) => `  ! ${w}`),
  ].filter((x) => x !== "").join("\n");
}
