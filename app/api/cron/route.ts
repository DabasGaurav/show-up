import { now } from "@/lib/clock";
import { runJobs } from "@/lib/jobs";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

// Scheduled jobs, every 15 minutes (see vercel.json). Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET`; Supabase pg_cron can call it the same way.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ ok: false }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return Response.json({ ok: false, error: "CRON_SECRET is not set" }, { status: 500 });
  }
  const at = await now();
  return Response.json({ ok: true, at, report: await runJobs(at, await siteUrl()) });
}
