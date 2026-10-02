"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, lock, unlock } from "@/lib/auth";
import { addInviteCode, setOrgStatus, setOrgVerified } from "@/lib/data/orgs";
import { isEnabled } from "@/lib/flags";

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("Not authorised");
}

export async function unlockAdminAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  if (!(await unlock("admin", String(form.get("passcode") ?? "")))) return { error: "Wrong passcode." };
  redirect("/admin");
}

export async function lockAdminAction() {
  await lock("admin");
  redirect("/");
}

export async function setOrgStatusAction(form: FormData) {
  await assertAdmin();
  const status = String(form.get("status"));
  if (status !== "approved" && status !== "rejected" && status !== "pending") return;
  await setOrgStatus(String(form.get("id")), status);
  revalidatePath("/admin");
}

/** Prototype: simulate the registration check that grants the Verified NGO badge. */
export async function setOrgVerifiedAction(form: FormData) {
  await assertAdmin();
  if (!isEnabled("F10")) return;
  await setOrgVerified(String(form.get("id")), form.get("verified") === "true");
  revalidatePath("/admin");
}

export async function addInviteCodeAction() {
  await assertAdmin();
  await addInviteCode();
  revalidatePath("/admin");
}
