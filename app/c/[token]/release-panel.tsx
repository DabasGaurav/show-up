"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { RELEASE_REASONS, RELEASE_REASON_LABEL } from "@/lib/constants";
import { confirmAction, releaseAction } from "./actions";

function Submit({ children, variant }: { children: React.ReactNode; variant?: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="h-16 w-full text-lg font-semibold">
      {pending ? "One moment…" : children}
    </Button>
  );
}

/** Big-choice buttons (brief A4.4, B5). Freeing a spot happens in a sheet. */
export function ReleasePanel({
  token,
  canConfirm,
  late,
  isRequest,
}: {
  token: string;
  canConfirm: boolean;
  late: boolean;
  isRequest: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      {canConfirm && (
        <form action={confirmAction}>
          <input type="hidden" name="token" value={token} />
          <Submit>Yes, I&apos;ll be there</Submit>
        </form>
      )}
      <Button type="button" variant="outline" className="h-16 w-full text-lg font-semibold" onClick={() => setOpen(true)}>
        {isRequest ? "I've changed my mind" : "I can't make it"}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title="No worries. Thanks for telling them.">
        <form action={releaseAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <fieldset>
            <legend className="text-sm text-ink-soft">What came up? You can skip this.</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {RELEASE_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary"
                >
                  <input type="radio" name="reason" value={r} className="sr-only" />
                  {RELEASE_REASON_LABEL[r]}
                </label>
              ))}
            </div>
          </fieldset>
          {late && (
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">
              It&apos;s close to the day, so this will show on your track record. Still much better than not turning up.
            </p>
          )}
          <Submit>Free up my spot</Submit>
        </form>
      </Sheet>
    </div>
  );
}
