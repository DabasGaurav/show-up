import "server-only";
import { now } from "@/lib/clock";
import { runJobs } from "@/lib/jobs";
import { siteUrl } from "@/lib/site";

/**
 * Brings time-based state up to date and returns the app's "Now". Pages that show
 * booking status call this so they are correct even between cron runs (and so the
 * prototype's simulated clock takes effect instantly).
 */
export async function tick(): Promise<Date> {
  const at = await now();
  await runJobs(at, await siteUrl());
  return at;
}
