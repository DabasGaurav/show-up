"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { RELEASE_REASONS } from "@/lib/constants";
import { confirmAction, releaseAction } from "./actions";

const REASON_LABEL = { work: "Work", health: "Health", travel: "Travel", other: "Other" } as const;

function Submit({ children, variant }: { children: React.ReactNode; variant?: "default" | "outline" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="h-14 w-full text-lg">
      {pending ? "One moment…" : children}
    </Button>
  );
}

/** "I'm coming" / "Can't make it" (§6.1 Screen 4). Release = one tap, reason optional. */
export function ReleasePanel({
  token,
  canConfirm,
  releaseLabel,
  late,
}: {
  token: string;
  canConfirm: boolean;
  releaseLabel: string;
  late: boolean;
}) {
  const [releasing, setReleasing] = useState(false);

  if (releasing) {
    return (
      <form action={releaseAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <fieldset>
          <legend className="text-sm font-medium">
            Reason <span className="font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {RELEASE_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border bg-card text-sm has-checked:border-brand has-checked:bg-info-soft has-checked:font-medium has-checked:text-brand"
              >
                <input type="radio" name="reason" value={r} className="sr-only" />
                {REASON_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
        {late && (
          <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            This is inside 24 hours, so it will show as a late release on your reliability record. Telling the NGO now
            is still much better than not turning up.
          </p>
        )}
        <Submit variant="destructive">Release my slot</Submit>
        <Button type="button" variant="ghost" size="tap" className="w-full" onClick={() => setReleasing(false)}>
          Go back
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {canConfirm && (
        <form action={confirmAction}>
          <input type="hidden" name="token" value={token} />
          <Submit>I&apos;m coming</Submit>
        </form>
      )}
      <Button type="button" variant="outline" className="h-14 w-full text-lg" onClick={() => setReleasing(true)}>
        {releaseLabel}
      </Button>
    </div>
  );
}
