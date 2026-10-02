"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser, requireUser } from "@/lib/auth";
import { getBooking, messageOrg } from "@/lib/data/bookings";
import { saveRating } from "@/lib/data/org-profile";
import { isOrgMember } from "@/lib/data/orgs";
import { getTask } from "@/lib/data/tasks";
import { requireFeature } from "@/lib/flags";

const tagsOf = (form: FormData) => form.getAll("tags").map(String);

/** Volunteer rates the NGO after an attended slot. */
export async function rateNgoAction(form: FormData) {
  requireFeature("F17");
  const user = await requireUser("/me");
  const b = await getBooking(String(form.get("booking_id")));
  if (!b || b.user_id !== user.id || b.status !== "attended") return;
  await saveRating(b.id, "volunteer", Number(form.get("score")), tagsOf(form));
  redirect("/me?rated=1");
}

/** NGO rates a volunteer after marking them attended. */
export async function rateVolunteerAction(form: FormData) {
  requireFeature("F17");
  const user = await requireUser("/ngo");
  const b = await getBooking(String(form.get("booking_id")));
  if (!b || b.status !== "attended" || !(await isOrgMember(user.id, b.org_id))) return;
  await saveRating(b.id, "ngo", Number(form.get("score")), tagsOf(form));
  revalidatePath(`/ngo/tasks/${b.task_id}/turnout/${b.occurrence_id}`);
}

/** "Contact NGO" message sheet on the task page (prototype: appears in the Message preview). */
export async function contactNgoAction(_prev: { sent?: boolean; error?: string }, form: FormData): Promise<{ sent?: boolean; error?: string }> {
  requireFeature("F10");
  const task = await getTask(String(form.get("task_id")));
  const text = String(form.get("message") ?? "").trim().slice(0, 500);
  if (!task) return { error: "Task not found." };
  if (text.length < 3) return { error: "Write your question first." };
  const user = await getUser();
  await messageOrg(task.org_id, "volunteer_message", `${user?.name ?? "A volunteer"} asked about ${task.title}: “${text}”`);
  return { sent: true };
}
