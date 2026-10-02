import { describe, expect, it } from "vitest";


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
});
