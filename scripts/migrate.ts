// Applies supabase/migrations to the hosted database: DATABASE_URL="…" npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  const [{ done }] = await sql.unsafe("select to_regclass('public.app_state') is not null as done");
  if (done) return console.log("Already set up: nothing to do.");
  const [{ has_auth }] = await sql.unsafe("select to_regprocedure('auth.uid()') is not null as has_auth");
  if (!has_auth) {
    // Supabase ships auth.uid(); other hosts get a stand-in so the security rules apply.
    await sql.unsafe(`create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;`);
  }
  const dir = path.join(process.cwd(), "supabase", "migrations");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await sql.unsafe(fs.readFileSync(path.join(dir, f), "utf8"));
    console.log(`applied ${f}`);
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => sql.end());
