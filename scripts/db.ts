// Database tasks for deployed (Supabase) databases.
//   npm run db:migrate   apply supabase/migrations to DATABASE_URL (skips if already applied)
//   npm run db:seed      wipe and rebuild the prototype sample data (prototype database only)
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import type { Db } from "@/lib/db";
import { reseed } from "@/supabase/seed";

const [cmd] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the Supabase connection string first.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const db: Db = {
  query: async <T,>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as unknown as T[],
  exec: async (text: string) => {
    await sql.unsafe(text);
  },
};

// Same steps as migrate() in lib/db, kept standalone so this script runs outside Next.js.
async function migrate(db: Db, _opts: { local: boolean }): Promise<boolean> {
  const [{ done }] = await db.query<{ done: boolean }>("select to_regclass('public.app_state') is not null as done");
  if (done) return false;
  const [{ has_auth }] = await db.query<{ has_auth: boolean }>("select to_regprocedure('auth.uid()') is not null as has_auth");
  if (!has_auth) {
    // Supabase ships auth.uid(); other Postgres hosts (Neon…) get a stub so the RLS migration applies.
    await db.exec(`create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;`);
  }
  const dir = path.join(process.cwd(), "supabase", "migrations");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), "utf8"));
    console.log(`applied ${f}`);
  }
  return true;
}

async function main() {
  if (cmd === "migrate") {
    console.log((await migrate(db, { local: false })) ? "Migrations applied." : "Already migrated: nothing to do.");
  } else if (cmd === "seed") {
    if (process.env.APP_MODE === "mvp") throw new Error("Refusing to seed sample data into the MVP database.");
    if (process.argv[3] !== "--yes") throw new Error("This wipes every NGO, task and booking. Re-run with --yes to confirm.");
    await migrate(db, { local: false });
    await reseed(db, new Date());
    console.log("Sample data rebuilt.");
  } else {
    throw new Error("Usage: db.ts migrate | seed --yes");
  }
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
