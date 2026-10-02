import "server-only";
import { now } from "@/lib/clock";
import { runJobs } from "@/lib/jobs";
import { siteUrl } from "@/lib/site";

/**
 * Brings anything time-based up to date and returns the current time. Pages that
 * show a spot's status call this, so they are right even between scheduled runs.
 */
export async function tick(): Promise<Date> {
  const at = await now();
  await runJobs(at, await siteUrl());
  return at;
}
