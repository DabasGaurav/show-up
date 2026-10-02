"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, lock, unlock, type User } from "@/lib/auth";
import { now } from "@/lib/clock";
import { createBooking } from "@/lib/data/bookings";
import { manualStandby, markReminderSent, saveManualStandby } from "@/lib/data/queues";
import { decideId } from "@/lib/data/volunteers";
import { query, queryOne } from "@/lib/db";
import { normalisePhone } from "@/lib/format";
import { siteUrl } from "@/lib/site";
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

// --- MVP1 Wizard-of-Oz queues (§4.2, §6.3) ---

export async function markReminderSentAction(form: FormData) {
  await assertAdmin();
  await markReminderSent(String(form.get("id")));
  revalidatePath("/admin/reminders");
}

export async function addStandbyPersonAction(form: FormData) {
  await assertAdmin();
  const name = String(form.get("name") ?? "").trim();
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (name.length < 2 || !phone) return;
  const list = await manualStandby();
  if (!list.some((p) => p.phone === phone)) await saveManualStandby([...list, { name, phone }]);
  revalidatePath("/admin/released");
}

export async function removeStandbyPersonAction(form: FormData) {
  await assertAdmin();
  const phone = String(form.get("phone"));
  await saveManualStandby((await manualStandby()).filter((p) => p.phone !== phone));
  revalidatePath("/admin/released");
}

/** "Mark filled": books the released seat for someone from the manual standby list. */
export async function fillSeatAction(form: FormData) {
  await assertAdmin();
  const phone = String(form.get("phone"));
  const person = (await manualStandby()).find((p) => p.phone === phone);
  if (!person) return;
  let user = await queryOne<User>("select * from users where phone = $1", [phone]);
  if (!user) {
    [user] = await query<User>("insert into users (name, phone) values ($1, $2) returning *", [person.name, phone]);
  }
  await createBooking({
    user,
    occurrenceId: String(form.get("occurrence_id")),
    source: "admin",
    now: await now(),
    origin: await siteUrl(),
    skipApproval: true,
  });
  revalidatePath("/admin/released");
}

/** Prototype: simulated ID approval (F8). */
export async function decideIdAction(form: FormData) {
  await assertAdmin();
  if (!isEnabled("F8")) return;
  await decideId(String(form.get("id")), form.get("decision") === "approve", await now());
  revalidatePath("/admin/ids");
}
