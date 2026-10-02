// Database tasks for deployed (Supabase) databases.
//   npm run db:migrate   apply supabase/migrations to DATABASE_URL (skips if already applied)
//   npm run db:seed      wipe and rebuild the prototype sample data (prototype database only)
import postgres from "postgres";
import { migrate, type Db } from "@/lib/db";
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
