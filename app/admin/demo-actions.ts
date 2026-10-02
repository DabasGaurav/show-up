"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLabUnlocked, signIn } from "@/lib/auth";
import { now } from "@/lib/clock";
import { getDb, queryOne } from "@/lib/db";
import { isPrototype } from "@/lib/flags";
import { reseed, SEED_IDS } from "@/supabase/seed";

// Prototype-only helpers for the team: reset the sample data and open the app as a sample account.

export async function resetSampleDataAction() {
  if (!isPrototype || !(await isLabUnlocked())) return;
  await reseed(await getDb(), await now());
  revalidatePath("/", "layout");
}

const ACCOUNTS = { volunteer: SEED_IDS.testerVolunteer, coordinator: SEED_IDS.testerCoordinator } as const;

export async function openAsAction(form: FormData) {
  if (!isPrototype || !(await isLabUnlocked())) return;
  const who = String(form.get("who")) as keyof typeof ACCOUNTS;
  const id = ACCOUNTS[who];
  if (!id || !(await queryOne("select 1 as ok from users where id = $1", [id]))) return;
  await signIn(id);
  redirect(who === "coordinator" ? "/ngo" : "/me");
}
