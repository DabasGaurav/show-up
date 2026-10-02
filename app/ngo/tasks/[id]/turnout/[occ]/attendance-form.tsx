"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveAttendanceAction, type AttendanceState } from "./actions";

export interface AttendanceRow {
  bookingId: string;
  name: string;
  mark: "attended" | "no_show" | null;
}

/** Attendance marking mode: tap to toggle Attended / No-show per person, then save (F5). */
export function AttendanceForm({
  taskId,
  occurrenceId,
  rows,
  chasingMinutes,
}: {
  taskId: string;
  occurrenceId: string;
  rows: AttendanceRow[];
  chasingMinutes: number | null;
}) {
  const [state, action, pending] = useActionState<AttendanceState, FormData>(saveAttendanceAction, {});
  const [marks, setMarks] = useState<Record<string, "attended" | "no_show" | null>>(
    Object.fromEntries(rows.map((r) => [r.bookingId, r.mark])),
  );
  const unmarked = rows.filter((r) => marks[r.bookingId] === null).length;
  const toggle = (id: string) =>
    setMarks((m) => ({ ...m, [id]: m[id] === "attended" ? "no_show" : "attended" }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="task_id" value={taskId} />
      <input type="hidden" name="occurrence_id" value={occurrenceId} />
      <ul className="space-y-2">
        {rows.map((r) => {
          const mark = marks[r.bookingId];
          return (
            <li key={r.bookingId}>
              <input type="hidden" name={`mark_${r.bookingId}`} value={mark ?? ""} />
              <button
                type="button"
                onClick={() => toggle(r.bookingId)}
                aria-label={`${r.name}: ${mark === "attended" ? "Attended" : mark === "no_show" ? "No-show" : "Not marked"}. Tap to change.`}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-4 text-left",
                  mark === "attended" && "border-ok bg-ok-soft",
                  mark === "no_show" && "border-gap bg-gap-soft",
                  mark === null && "bg-card",
                )}
              >
                <span className="font-medium">{r.name}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold",
                    mark === "attended" && "text-ok",
                    mark === "no_show" && "text-gap",
                    mark === null && "text-muted-foreground",
                  )}
                >
                  {mark === "attended" && <Check className="size-4" aria-hidden />}
                  {mark === "no_show" && <X className="size-4" aria-hidden />}
                  {mark === "attended" ? "Attended" : mark === "no_show" ? "No-show" : "Tap to mark"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="tap" onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.bookingId, "attended" as const])))}>
          Mark all attended
        </Button>
      </div>
      <Field label="Minutes spent chasing volunteers for this event" htmlFor="chasing_minutes" optional>
        <TextInput id="chasing_minutes" name="chasing_minutes" type="number" inputMode="numeric" min={0} max={2000} defaultValue={chasingMinutes ?? ""} className="max-w-40" />
      </Field>
      <FormError message={state.error} />
      {state.saved && (
        <p role="status" className="rounded-lg bg-ok-soft px-3 py-2 text-sm font-medium text-ok">
          Attendance saved. Reliability records are updated.
        </p>
      )}
      <Button type="submit" size="tap" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Save attendance"}
      </Button>
      {unmarked > 0 && (
        <p className="text-xs text-muted-foreground">
          {unmarked} not marked yet. Anyone left unmarked 72 hours after the start is saved as “Not recorded”.
        </p>
      )}
    </form>
  );
}
