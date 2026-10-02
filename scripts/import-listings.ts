// Loads the launch listings.
//   npm run listings:check    prints what would change, writes nothing
//   npm run listings:import   writes it
// With DATABASE_URL set it works on the hosted database; otherwise on your local one.
import fs from "node:fs";
import { createRemoteDb, getDb, migrate, migrationFiles } from "@/lib/db";
import { importListings, printReport, type ImportReport, type Listings } from "@/lib/import-listings";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!file) {
  console.error("Usage: tsx scripts/import-listings.ts data/listings.json [--dry-run]");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, "utf8")) as Listings;

async function viaLocalSite(): Promise<ImportReport | null> {
  const port = process.env.PORT || 3000;
  try {
    const res = await fetch(`http://localhost:${port}/api/dev/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, dryRun }) });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || `status ${res.status}`);
    console.log(`(through the local site on port ${port})`);
    return body.report;
  } catch (e) {
    if ((e as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED") return null; // not running: open the database directly
    throw e;
  }
}

async function main() {
  let report: ImportReport | null = null;
  const url = process.env.DATABASE_URL;
  if (url) {
    console.log(`Hosted database: ${new URL(url).host}`);
    const db = await createRemoteDb(url);
    const applied = new Set((await db.query<{ key: string }>("select key from app_state where key like 'migration:%'")).map((r) => r.key.slice(10)));
    const pending = migrationFiles().filter((f) => f.name >= "0003" && !applied.has(f.name));
    if (pending.length && dryRun) {
      console.log(`The database needs ${pending.map((f) => f.name).join(", ")} first; the real run applies it. Until then everything counts as new.`);
      report = await importListings(data, { dryRun, assumeEmpty: true });
    } else if (pending.length) {
      await migrate(db, { local: false });
      console.log(`Applied ${pending.map((f) => f.name).join(", ")}.`);
    }
  } else {
    report = await viaLocalSite();
  }
  if (!report) {
    await getDb();
    report = await importListings(data, { dryRun });
  }
  console.log(printReport(report));
}

main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => process.exit());
