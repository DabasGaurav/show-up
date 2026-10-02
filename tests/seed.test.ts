import { describe, expect, it } from "vitest";
import { createLocalDb, migrate } from "@/lib/db";
import { weekendDays } from "@/lib/format";
import { reliabilityRecord, reliabilityString, responseRate, trustLevel, pausedUntil, type BookingStatus, type IdStatus } from "@/lib/rules";
import { reseed, SEED_IDS } from "@/supabase/seed";

// A real organisation name must never appear in sample data (§0.5, §16).
const SEED_NGOS = [
  "Akshar Learning Circle", "Hara Bhara Trust", "Annapoorna Food Bank", "Paws & Care Shelter",
  "Swasthya Saathi", "Saath Elder Care", "Digital Disha", "Neev Community Group",
];

async function seeded(base: Date) {
  const db = await createLocalDb();
  await migrate(db, { local: true });
  await reseed(db, base);
  return db;
}

describe("seed data (§11)", () => {
  // Run for every day of the week so "this weekend" tasks always exist.
  const bases = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 9, 5 + i, 3, 30))); // Mon–Sun, 09:00 IST

  it("has 8 fictional NGOs, 30 upcoming tasks and 40 volunteers at every level", async () => {
    const base = bases[3];
    const db = await seeded(base);
    const orgs = await db.query<{ name: string; verified_at: Date | null }>("select name, verified_at from organisations order by created_at");
    expect(orgs.map((o) => o.name).sort()).toEqual([...SEED_NGOS].sort());
    expect(orgs.filter((o) => o.verified_at === null).map((o) => o.name)).toEqual(["Neev Community Group"]);

    const upcoming = await db.query<{ min_trust: string; mode: string; commitment: string; duration_min: number }>(
      "select min_trust, mode, commitment, duration_min from tasks where start_at > $1", [base]);
    expect(upcoming).toHaveLength(30);
    for (const [k, vals] of Object.entries({ min_trust: ["everyone", "verified", "trusted"], mode: ["onsite", "online"], commitment: ["one_off", "recurring"] })) {
      expect(new Set(upcoming.map((t) => (t as Record<string, unknown>)[k]))).toEqual(new Set(vals));
    }
    expect(new Set(upcoming.map((t) => t.duration_min))).toEqual(new Set([120, 180, 300]));

    const vols = await db.query<{ id: string; level: string }>(
      "select id, level from users where role = 'volunteer' and id <> $1", [SEED_IDS.testerVolunteer]);
    expect(vols).toHaveLength(40);
    expect(new Set(vols.map((v) => v.level))).toEqual(new Set(["new", "verified", "trusted"]));

    // Re-running the seed is clean and repeatable, and keeps Test Lab evidence.
    await db.query("insert into lab_sessions (scenario, tester_id, persona) values ('SH1', 'T-V1', 'Volunteer')");
    await db.query("insert into events (user_id, session_id, name) select id, 'keep', 'booking_created' from users limit 1");
    await reseed(db, base);
    expect(await db.query("select 1 from lab_sessions")).toHaveLength(1);
    expect(await db.query("select 1 from events where session_id = 'keep' and user_id is null")).toHaveLength(1);
    expect((await db.query("select 1 from bookings b left join users u on u.id = b.user_id where u.id is null")).length).toBe(0);
    expect((await db.query("select 1 from users")).length).toBe(49);
  });

  it("gives the SH5 applicants exactly the profiles in the PRD", async () => {
    const base = bases[2];
    const db = await seeded(base);
    const rows = await db.query<{ name: string; id: string; id_status: IdStatus }>(
      `select u.name, u.id, u.id_status from bookings b join users u on u.id = b.user_id
       join task_occurrences oc on oc.id = b.occurrence_id
       where oc.task_id = $1 and b.status = 'requested' order by b.created_at desc`, [SEED_IDS.sh5Task]);
    expect(rows).toHaveLength(5);
    const profile = async (u: (typeof rows)[number]) => {
      const f = (await db.query<{ status: BookingStatus; start_at: Date }>(
        "select b.status, oc.start_at from bookings b join task_occurrences oc on oc.id = b.occurrence_id where b.user_id = $1", [u.id],
      )).map((r) => ({ status: r.status, startAt: r.start_at }));
      const r = await db.query<{ avg: number; n: number; invite: number }>(
        `select round(avg(r.score), 1)::float as avg, count(*)::int as n,
                count(*) filter (where 'Would invite again' = any(r.tags))::int as invite
         from ratings r join bookings b on b.id = r.booking_id where b.user_id = $1 and r.rater_type = 'ngo'`, [u.id]);
      return { level: trustLevel(u.id_status, f, base), record: reliabilityString(reliabilityRecord(f)), paused: pausedUntil(f, base) !== null, ...r[0] };
    };
    const [a1, a2, a3, a4, a5] = await Promise.all(rows.map(profile));
    expect(a1).toMatchObject({ level: "trusted", record: "Attended 9 of 9 booked slots · 0 late releases · 0 no-shows", avg: 4.8 });
    expect(a2).toMatchObject({ level: "verified", record: "Attended 3 of 4 booked slots · 1 late release · 0 no-shows" });
    expect(a3).toMatchObject({ level: "new", record: "No slots yet" });
    expect(a4).toMatchObject({ level: "verified", record: "Attended 5 of 7 booked slots · 0 late releases · 2 no-shows", paused: true });
    expect(a5).toMatchObject({ level: "trusted", record: "Attended 12 of 12 booked slots · 0 late releases · 0 no-shows", invite: 5 });
  });

  it("sets up the tester volunteer: Verified, 2 attended, Teaching + Plantation, Delhi NCR", async () => {
    const base = bases[0];
    const db = await seeded(base);
    const [u] = await db.query<{ id_status: IdStatus; city: string; saved_causes: string[]; level: string }>(
      "select id_status, city, saved_causes, level from users where id = $1", [SEED_IDS.testerVolunteer]);
    expect(u).toMatchObject({ level: "verified", city: "Delhi NCR", saved_causes: ["Teaching", "Plantation"] });
    const attended = await db.query("select 1 from bookings where user_id = $1 and status = 'attended'", [SEED_IDS.testerVolunteer]);
    expect(attended).toHaveLength(2);
  });

  it.each(bases)("has Teaching/Plantation tasks in Delhi NCR this weekend when seeded on %s", async (base) => {
    const db = await seeded(base);
    const [sat, sun] = weekendDays(base);
    const from = new Date(Math.max(sat.getTime() - 12 * 36e5, base.getTime()));
    const to = new Date(sun.getTime() + 12 * 36e5);
    const rows = await db.query(
      `select 1 from tasks t join organisations o on o.id = t.org_id
       where t.city = 'Delhi NCR' and t.cause in ('Teaching','Plantation') and t.min_trust in ('everyone','verified')
         and t.start_at > $1 and t.start_at < $2`, [from, to]);
    // On a Sunday only today's later sessions are left in "this weekend".
    expect(rows.length).toBeGreaterThanOrEqual(base.getUTCDay() === 0 ? 1 : 2);
    // Nothing is seeded in the past as "upcoming" on its first weekend.
    const sh2 = await db.query<{ start_at: Date }>("select start_at from tasks where id = any($1::uuid[])", [[...SEED_IDS.sh2Tasks]]);
    expect(sh2).toHaveLength(3);
    expect(sh2.every((t) => t.start_at.getTime() > base.getTime())).toBe(true);
  });

  it("gives verified NGOs a response rate and reviews, and the new group neither", async () => {
    const base = bases[4];
    const db = await seeded(base);
    const rate = async (name: string) => {
      const reqs = await db.query<{ created_at: Date; decided_at: Date | null }>(
        `select b.created_at, b.decided_at from bookings b join task_occurrences oc on oc.id = b.occurrence_id
         join tasks t on t.id = oc.task_id join organisations o on o.id = t.org_id
         where o.name = $1 and t.booking_mode = 'approval' and b.status <> 'requested'`, [name]);
      return responseRate(reqs.map((r) => ({ createdAt: r.created_at, decidedAt: r.decided_at })), base);
    };
    const swasthya = await rate("Swasthya Saathi");
    expect(swasthya).not.toBeNull();
    expect(swasthya!).toBeGreaterThanOrEqual(80);
    expect(await rate("Neev Community Group")).toBeNull();
    const reviews = await db.query<{ name: string; n: number }>(
      `select o.name, count(r.id)::int as n from organisations o
       left join tasks t on t.org_id = o.id left join task_occurrences oc on oc.task_id = t.id
       left join bookings b on b.occurrence_id = oc.id left join ratings r on r.booking_id = b.id and r.rater_type = 'volunteer'
       group by o.name`);
    expect(reviews.find((r) => r.name === "Neev Community Group")!.n).toBe(0);
    expect(reviews.filter((r) => r.name !== "Neev Community Group").every((r) => r.n >= 3)).toBe(true);
  });
});
