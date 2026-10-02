"use server";

import { revalidatePath } from "next/cache";
import { isLabUnlocked } from "@/lib/auth";
import { now, setNow } from "@/lib/clock";
import { isEnabled } from "@/lib/flags";
import { runJobs } from "@/lib/jobs";
import { HOUR_MS } from "@/lib/rules";
import { siteUrl } from "@/lib/site";

const STEP: Record<string, number> = { "+1h": HOUR_MS, "+12h": 12 * HOUR_MS, "+1d": 24 * HOUR_MS };

export async function setClockAction(form: FormData) {
  if (!isEnabled("SIMULATED_CLOCK") || !(await isLabUnlocked())) return;
  const op = String(form.get("op"));
  if (op === "reset") await setNow(null);
  else if (op in STEP) await setNow(new Date((await now()).getTime() + STEP[op]));
  else {
    const at = new Date(`${String(form.get("at"))}:00+05:30`);
    if (!Number.isNaN(at.getTime())) await setNow(at);
  }
  // Apply everything that became due at the new time (confirmation requests, reminders…).
  await runJobs(await now(), await siteUrl());
  revalidatePath(String(form.get("path") || "/admin"));
}
