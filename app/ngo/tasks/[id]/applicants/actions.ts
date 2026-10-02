"use server";

import { revalidatePath } from "next/cache";
import { now } from "@/lib/clock";
import { decideRequest, getBooking } from "@/lib/data/bookings";
import { track } from "@/lib/events";
import { requireOrgTask } from "@/lib/ngo";
import { siteUrl } from "@/lib/site";

export async function decideAction(form: FormData) {
  const taskId = String(form.get("task_id"));
  const { user, task } = await requireOrgTask(taskId);
  const b = await getBooking(String(form.get("booking_id")));
  if (!b || b.task_id !== task.id) return;
  const accept = form.get("decision") === "accept";
  const at = await now();
  const res = await decideRequest(b, accept, at, await siteUrl());
  await track(
    "applicant_decided",
    {
      task_id: task.id,
      booking_id: b.id,
      applicant_id: b.user_id,
      decision: accept ? "accept" : "decline",
      ok: res.ok,
      hours_to_decide: Math.round(((at.getTime() - b.created_at.getTime()) / 36e5) * 10) / 10,
    },
    user.id,
  );
  revalidatePath(`/ngo/tasks/${taskId}/applicants`);
}
