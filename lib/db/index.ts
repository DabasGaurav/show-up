import "server-only";
import fs from "node:fs";
import path from "node:path";

// One Postgres schema, two drivers:
//  - DATABASE_URL set  → hosted Postgres (the live site)
//  - otherwise         → a local database in .data/, for development
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

export function migrationFiles(): { name: string; sql: string }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8") }));
}

async function isMigrated(db: Db): Promise<boolean> {
  const rows = await db.query<{ exists: boolean }>(
    "select to_regclass('public.app_state') is not null as exists",
  );
  return rows[0].exists;
}

/** The first two files went in together before migrations were recorded one by one. */
const BASELINE = "0003";

/** Applies any migration file not yet applied. Returns true if it changed anything. */
export async function migrate(db: Db, { local }: { local: boolean }): Promise<boolean> {
  const fresh = !(await isMigrated(db));
  if (fresh) {
    // Supabase ships auth.uid(); any other Postgres (embedded, Neon…) gets the stub.
    const [{ has_auth }] = await db.query<{ has_auth: boolean }>(
      "select to_regprocedure('auth.uid()') is not null as has_auth",
    );
    if (local || !has_auth) await db.exec(LOCAL_AUTH_STUB);
  }
  const done = fresh
    ? new Set<string>()
    : new Set((await db.query<{ key: string }>("select key from app_state where key like 'migration:%'")).map((r) => r.key.slice(10)));
  let changed = false;
  for (const f of migrationFiles()) {
    if (done.has(f.name) || (!fresh && f.name < BASELINE)) continue;
    await db.exec(f.sql);
    await db.query("insert into app_state (key, value) values ($1, 'true'::jsonb) on conflict (key) do nothing", [`migration:${f.name}`]);
    changed = true;
  }
  return changed;
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

export async function createRemoteDb(url: string): Promise<Db> {
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
  // Hosted builds have no writable disk for the local database.
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set.");
  // Tests use a throwaway in-memory database.
  const memory = process.env.SHOWUP_DB === "memory";
  const db = await createLocalDb(memory ? undefined : path.join(process.cwd(), ".data", "pglite"));
  await migrate(db, { local: true });
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
