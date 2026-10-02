// Applies supabase/migrations to the hosted database: DATABASE_URL="…" npm run db:migrate
import { createRemoteDb, migrate } from "@/lib/db";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}

createRemoteDb(url)
  .then((db) => migrate(db, { local: false }))
  .then((changed) => console.log(changed ? "Database updated." : "Already up to date: nothing to do."))
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1; })
  .finally(() => process.exit());
