"use server";

import { revalidatePath } from "next/cache";
import { now } from "@/lib/clock";
import { listBookingsForOccurrence, markAttendance } from "@/lib/data/bookings";
import { getOccurrence } from "@/lib/data/tasks";
import { syncLevels } from "@/lib/data/volunteers";
import { query } from "@/lib/db";
import { track } from "@/lib/events";
import { requireOrgTask } from "@/lib/ngo";
import { canMarkAttendance } from "@/lib/rules";

export interface AttendanceState {
  saved?: boolean;
  error?: string;
}

export async function saveAttendanceAction(_prev: AttendanceState, form: FormData): Promise<AttendanceState> {
  const taskId = String(form.get("task_id"));
  const occId = String(form.get("occurrence_id"));
  const { user, task } = await requireOrgTask(taskId);
  const occ = await getOccurrence(occId);
  if (!occ || occ.task_id !== task.id) return { error: "We couldn't find that activity." };
  if (!canMarkAttendance(occ.start_at, await now())) {
    return { error: "You can mark who came once it starts, and for 3 days after." };
  }

  const bookings = await listBookingsForOccurrence(occId);
  const marks: Record<string, "attended" | "no_show"> = {};
  for (const b of bookings) {
    const v = form.get(`mark_${b.id}`);
    if (v === "attended" || v === "no_show") marks[b.id] = v;
  }
  const changed = await markAttendance(occId, marks);
  await syncLevels(bookings.map((b) => b.user_id), await now());

  // §10.2: one question in the post-event form.
  const minutes = Number(form.get("chasing_minutes"));
  const chasing = form.get("chasing_minutes") !== "" && Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : null;
  if (chasing !== null) {
    await query(
      `insert into app_state (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value`,
      [`chasing_minutes:${occId}`, JSON.stringify(chasing)],
    );
  }
  await track(
    "attendance_marked",
    {
      task_id: task.id,
      occurrence_id: occId,
      changed,
      attended: Object.values(marks).filter((m) => m === "attended").length,
      no_show: Object.values(marks).filter((m) => m === "no_show").length,
      chasing_minutes: chasing,
    },
    user.id,
  );
  revalidatePath(`/ngo/tasks/${taskId}/turnout/${occId}`);
  return { saved: true };
}
