import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createLocalDb, migrate } from "@/lib/db";

describe("database schema (§7)", () => {
  it("applies every migration to a fresh Postgres and is idempotent", async () => {
    const db = await createLocalDb();
    expect(await migrate(db, { local: true })).toBe(true);
    expect(await migrate(db, { local: true })).toBe(false);

    const tables = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1",
    );
    expect(tables.map((t) => t.tablename)).toEqual([
      "app_state", "bookings", "events", "lab_sessions", "notifications", "org_members",
      "organisations", "ratings", "standby", "standby_offers", "task_occurrences", "tasks", "users",
    ]);
    // RLS on all tables (§13).
    expect(tables.every((t) => t.rowsecurity)).toBe(true);
  });

  it("derives turnout and the reliability record from bookings", async () => {
    const db = await createLocalDb();
    await migrate(db, { local: true });
    const [org] = await db.query<{ id: string }>(
      "insert into organisations (name, slug, city, status) values ('Test Circle', 'test-circle', 'Pune', 'approved') returning id",
    );
    const [task] = await db.query<{ id: string }>(
      `insert into tasks (org_id, title, cause, role, done_definition, mode, start_at, end_at, duration_min,
         slots_needed, contact_name, contact_role, contact_phone, share_slug, status)
       values ($1, 'Sapling drive', 'Plantation', 'Planter', 'Fifty saplings planted and watered', 'onsite',
         now() + interval '5 days', now() + interval '5 days 2 hours', 120, 4, 'A', 'Coordinator', '+910000000000', 'sapling', 'published')
       returning id`,
      [org.id],
    );
    const [occ] = await db.query<{ id: string }>(
      "insert into task_occurrences (task_id, start_at, end_at) select id, start_at, end_at from tasks where id = $1 returning id",
      [task.id],
    );
    const statuses = ["confirmed", "booked", "released_early", "attended", "no_show", "released_late"];
    for (const [i, status] of statuses.entries()) {
      const [u] = await db.query<{ id: string }>(
        "insert into users (name, phone) values ($1, $2) returning id",
        [`Volunteer ${i}`, `+91900000000${i}`],
      );
      await db.query(
        "insert into bookings (occurrence_id, user_id, status, confirm_token) values ($1, $2, $3, $4)",
        [occ.id, u.id, status, `tok-${i}`],
      );
    }
    const [t] = await db.query(
      "select needed, booked::int, confirmed::int, unconfirmed::int, released::int from v_turnout where occurrence_id = $1",
      [occ.id],
    );
    expect(t).toEqual({ needed: 4, booked: 4, confirmed: 1, unconfirmed: 1, released: 2 });

    const rel = await db.query(
      "select sum(attended)::int as attended, sum(booked)::int as booked, sum(late_releases)::int as late, sum(no_shows)::int as no_shows from v_reliability",
    );
    expect(rel[0]).toEqual({ attended: 1, booked: 3, late: 1, no_shows: 1 });
  });

  it("allows one live booking per volunteer per occurrence", async () => {
    const db = await createLocalDb();
    await migrate(db, { local: true });
    const [org] = await db.query<{ id: string }>(
      "insert into organisations (name, slug, city) values ('T', 't', 'Pune') returning id",
    );
    const [occ] = await db.query<{ id: string }>(
      `with t as (insert into tasks (org_id, title, cause, role, done_definition, mode, start_at, end_at, duration_min,
         slots_needed, contact_name, contact_role, contact_phone, share_slug)
       values ($1, 'x', 'Teaching', 'r', 'd', 'online', now(), now(), 60, 2, 'A', 'B', 'C', 's') returning *)
       insert into task_occurrences (task_id, start_at, end_at) select id, start_at, end_at from t returning id`,
      [org.id],
    );
    const [u] = await db.query<{ id: string }>("insert into users (name) values ('V') returning id");
    const book = (status: string, token: string) =>
      db.query("insert into bookings (occurrence_id, user_id, status, confirm_token) values ($1,$2,$3,$4)", [occ.id, u.id, status, token]);
    await book("released_early", "a");
    await book("booked", "b");
    await expect(book("booked", "c")).rejects.toThrow();
  });
});
