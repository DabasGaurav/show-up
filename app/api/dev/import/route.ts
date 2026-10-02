import { importListings, type Listings } from "@/lib/import-listings";

export const dynamic = "force-dynamic";

// `npm run listings:import` calls this when the local site is running (the local
// database can only be open in one place). On the live site the script talks to
// the database directly and this address refuses.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "Local only." }, { status: 403 });
  }
  const { data, dryRun } = (await req.json()) as { data: Listings; dryRun: boolean };
  return Response.json({ ok: true, report: await importListings(data, { dryRun: Boolean(dryRun) }) });
}
