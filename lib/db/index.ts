import "server-only";
import fs from "node:fs";
import path from "node:path";
import { APP_MODE } from "@/lib/flags";

// One Postgres schema, two drivers:
//  - DATABASE_URL set  → Supabase Postgres (deployed builds)
//  - otherwise         → embedded Postgres (PGlite) in .data/, for local dev
// Both run the same files in /supabase/migrations.

export type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

// Supabase provides auth.uid(); locally we stub it so the RLS migration applies.
const LOCAL_AUTH_STUB = `
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
`;

export function migrationSql(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
}

async function isMigrated(db: Db): Promise<boolean> {
  const rows = await db.query<{ exists: boolean }>(
    "select to_regclass('public.app_state') is not null as exists",
  );
  return rows[0].exists;
}

export async function migrate(db: Db, { local }: { local: boolean }): Promise<boolean> {
  if (await isMigrated(db)) return false;
  if (local) await db.exec(LOCAL_AUTH_STUB);
  for (const sql of migrationSql()) await db.exec(sql);
  return true;
}

/** Embedded Postgres. Pass no dataDir for an in-memory database (tests). */
export async function createLocalDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) fs.mkdirSync(path.dirname(dataDir), { recursive: true });
  const pg = new PGlite(dataDir);
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await pg.query<T>(sql, params)).rows;
    },
    async exec(sql: string) {
      await pg.exec(sql);
    },
  };
}

async function createRemoteDb(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { prepare: false, max: 5 });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
  };
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) return createRemoteDb(url);
  // Tests use a throwaway in-memory database and seed it themselves.
  const memory = process.env.SHOWUP_DB === "memory";
  const db = await createLocalDb(memory ? undefined : path.join(process.cwd(), ".data", `pglite-${APP_MODE}`));
  const fresh = await migrate(db, { local: true });
  if (fresh && APP_MODE === "prototype" && !memory) {
    const { seed } = await import("@/supabase/seed");
    await seed(db);
  }
  return db;
}

// Survive hot reloads in dev: one connection per server process.
const globalForDb = globalThis as unknown as { __showupDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  return (globalForDb.__showupDb ??= connect());
}

export async function query<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}

export async function queryOne<T = Row>(sql: string, params?: unknown[]): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}
