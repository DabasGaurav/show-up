import { seed, seedAllowed } from "@/supabase/seed";

export const dynamic = "force-dynamic";

// `npm run seed` calls this on your own computer. It refuses to run anywhere else.
export async function POST() {
  if (!seedAllowed()) return Response.json({ ok: false, error: "Sample data is for local testing only." }, { status: 403 });
  return Response.json({ ok: true, ...(await seed()) });
}
