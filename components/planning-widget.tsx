"use client";

import { useActionState } from "react";
import { planningAnswerAction } from "@/app/lab/actions";
import { TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";

/** SH7: "You need 15 people. How many sign-ups will you aim for?" (§6.1 Screen 9). */
export function PlanningWidget({ needed }: { needed: number }) {
  const [state, action, pending] = useActionState(planningAnswerAction, {});
  return (
    <section className="mt-6 rounded-xl border-2 border-brand/30 bg-info-soft p-4">
      <h2 className="font-semibold text-brand">Planning</h2>
      <form action={action} className="mt-2 space-y-3">
        <input type="hidden" name="needed" value={needed} />
        <label htmlFor="planned_signups" className="block text-sm font-medium">
          You need {needed} people. How many sign-ups will you aim for?
        </label>
        <div className="flex gap-2">
          <TextInput id="planned_signups" name="planned_signups" type="number" inputMode="numeric" min={1} max={200} required className="max-w-32 bg-card" />
          <Button type="submit" size="tap" disabled={pending}>Save</Button>
        </div>
        {state.saved !== undefined && (
          <p role="status" className="text-sm font-medium text-ok">Saved: you&apos;d aim for {state.saved} sign-ups.</p>
        )}
      </form>
    </section>
  );
}
