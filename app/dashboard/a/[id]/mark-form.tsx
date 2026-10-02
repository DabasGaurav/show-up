"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { FormError } from "@/components/forms/field";
import { Avatar } from "@/components/kit";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { markAction, type MarkState } from "./actions";

export interface MarkRow {
  spotId: string;
  name: string;
  mark: "attended" | "no_show" | null;
}

/** Mark who came: ✓ or ✕ per person, then Save. */
export function MarkForm({ activityId, dateId, rows }: { activityId: string; dateId: string; rows: MarkRow[] }) {
  const [state, action, pending] = useActionState<MarkState, FormData>(markAction, {});
  const [marks, setMarks] = useState<Record<string, "attended" | "no_show" | null>>(Object.fromEntries(rows.map((r) => [r.spotId, r.mark])));
  useEffect(() => {
    if (state.saved) toast("Thanks! Everyone's track record is updated.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="activity_id" value={activityId} />
      <input type="hidden" name="date_id" value={dateId} />
      <ul className="space-y-2">
        {rows.map((r) => {
          const mark = marks[r.spotId];
          const set = (m: "attended" | "no_show") => setMarks((p) => ({ ...p, [r.spotId]: m }));
          return (
            <li key={r.spotId} className={cn("flex items-center gap-3 rounded-xl border p-2 pl-3", mark === "attended" && "border-ok bg-ok-soft", mark === "no_show" && "border-gap bg-gap-soft")}>
              <input type="hidden" name={`mark_${r.spotId}`} value={mark ?? ""} />
              <Avatar name={r.name} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{r.name}</span>
                <span className="text-sm text-ink-soft">{mark === "attended" ? "Came" : mark === "no_show" ? "Didn't come" : "Not marked yet"}</span>
              </span>
              <button type="button" aria-label={`${r.name} came`} aria-pressed={mark === "attended"} onClick={() => set("attended")} className={cn("flex size-12 items-center justify-center rounded-full border bg-card", mark === "attended" && "border-ok bg-ok text-white")}><Check aria-hidden /></button>
              <button type="button" aria-label={`${r.name} didn't come`} aria-pressed={mark === "no_show"} onClick={() => set("no_show")} className={cn("flex size-12 items-center justify-center rounded-full border bg-card", mark === "no_show" && "border-gap bg-gap text-white")}><X aria-hidden /></button>
            </li>
          );
        })}
      </ul>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}
