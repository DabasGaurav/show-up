"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, lockAdmin, unlockAdmin } from "@/lib/auth";
import { decideOrg } from "@/lib/data/orgs";

export async function unlockAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  if (!(await unlockAdmin(String(form.get("passcode") ?? "")))) return { error: "That's not it. Try again." };
  redirect("/admin");
}

export async function lockAction() {
  await lockAdmin();
  redirect("/");
}

/** Approve (gives the ✓ and makes their activities visible) or reject an NGO. */
export async function decideOrgAction(form: FormData) {
  if (!(await isAdmin())) throw new Error("Not allowed");
  await decideOrg(String(form.get("id")), form.get("decision") === "approve");
  revalidatePath("/admin");
}
