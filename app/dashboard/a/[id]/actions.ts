"use server";

import { revalidatePath } from "next/cache";
import { now } from "@/lib/clock";
import { listSpotsForDate, markWhoCame } from "@/lib/data/bookings";
import { getDate } from "@/lib/data/tasks";
import { track } from "@/lib/events";
import { requireOwnActivity } from "@/lib/ngo";
import { canMark } from "@/lib/rules";

export interface MarkState {
  saved?: boolean;
  error?: string;
}

export async function markAction(_prev: MarkState, form: FormData): Promise<MarkState> {
  const activityId = String(form.get("activity_id"));
  const dateId = String(form.get("date_id"));
  const { user, activity } = await requireOwnActivity(activityId);
  const date = await getDate(dateId);
  if (!date || date.task_id !== activity.id) return { error: "We couldn't find that activity." };
  if (!canMark(date.start_at, await now())) return { error: "You can mark who came once it starts, and for 3 days after." };

  const marks: Record<string, "attended" | "no_show"> = {};
  for (const s of await listSpotsForDate(dateId)) {
    const v = form.get(`mark_${s.id}`);
    if (v === "attended" || v === "no_show") marks[s.id] = v;
  }
  const changed = await markWhoCame(dateId, marks);
  await track("marked_who_came", { activity: activityId, date: dateId, changed }, user.id);
  revalidatePath(`/dashboard/a/${activityId}`);
  return { saved: true };
}
