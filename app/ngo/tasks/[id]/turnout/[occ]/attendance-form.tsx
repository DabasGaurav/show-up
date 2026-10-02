"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Avatar } from "@/components/kit";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveAttendanceAction, type AttendanceState } from "./actions";

export interface AttendanceRow {
  bookingId: string;
  name: string;
  mark: "attended" | "no_show" | null;
}

/** "Mark who came": a big tick and cross on each row, then Save (brief B10). */
export function AttendanceForm({ taskId, occurrenceId, rows, chasingMinutes }: { taskId: string; occurrenceId: string; rows: AttendanceRow[]; chasingMinutes: number | null }) {
  const [state, action, pending] = useActionState<AttendanceState, FormData>(saveAttendanceAction, {});
  const [marks, setMarks] = useState<Record<string, "attended" | "no_show" | null>>(Object.fromEntries(rows.map((r) => [r.bookingId, r.mark])));
  const unmarked = rows.filter((r) => marks[r.bookingId] === null).length;
  useEffect(() => {
    if (state.saved) toast("Thanks! Everyone's track record is updated.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="occurrence_id" value={occurrenceId} />
      <ul className="space-y-2">
        {rows.map((r) => {
          const mark = marks[r.bookingId];
          const set = (m: "attended" | "no_show") => setMarks((prev) => ({ ...prev, [r.bookingId]: m }));
          return (
            <li key={r.bookingId} className={cn("flex items-center gap-3 rounded-xl border p-2 pl-3", mark === "attended" && "border-ok bg-ok-soft", mark === "no_show" && "border-gap bg-gap-soft")}>
              <input type="hidden" name={`mark_${r.bookingId}`} value={mark ?? ""} />
              <Avatar name={r.name} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="text-sm text-ink-soft">{mark === "attended" ? "Came" : mark === "no_show" ? "Didn't come" : "Not marked yet"}</span>
              </span>
              <button type="button" aria-label={`${r.name} came`} aria-pressed={mark === "attended"} onClick={() => set("attended")} className={cn("flex size-12 items-center justify-center rounded-full border bg-card", mark === "attended" && "border-ok bg-ok text-white")}>
                <Check aria-hidden />
              </button>
              <button type="button" aria-label={`${r.name} didn't come`} aria-pressed={mark === "no_show"} onClick={() => set("no_show")} className={cn("flex size-12 items-center justify-center rounded-full border bg-card", mark === "no_show" && "border-gap bg-gap text-white")}>
                <X aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" size="tap" onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.bookingId, "attended" as const])))}>
        Everyone came
      </Button>
      <Field label="Minutes you spent chasing people for this one" htmlFor="chasing_minutes" optional>
        <TextInput id="chasing_minutes" name="chasing_minutes" type="number" inputMode="numeric" min={0} max={2000} defaultValue={chasingMinutes ?? ""} className="max-w-40" />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      {unmarked > 0 && <p className="text-sm text-ink-soft">{unmarked} still to mark.</p>}
    </form>
  );
}
