"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Sheet } from "@/components/sheet";
import { Button } from "@/components/ui/button";
import { REASONS, REASON_LABEL } from "@/lib/constants";
import { cantAction, yesAction } from "./actions";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="h-16 w-full text-lg font-semibold">{pending ? "One moment…" : children}</Button>;
}

/** Two big buttons. "I can't make it" asks for an optional reason in a sheet. */
export function CheckIn({ token, canSayYes, late, startOpen }: { token: string; canSayYes: boolean; late: boolean; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="space-y-3">
      {canSayYes && (
        <form action={yesAction}>
          <input type="hidden" name="token" value={token} />
          <Submit>Yes, I&apos;ll be there</Submit>
        </form>
      )}
      <Button type="button" variant="outline" className="h-16 w-full text-lg font-semibold" onClick={() => setOpen(true)}>I can&apos;t make it</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="No worries. Thanks for telling them.">
        <form action={cantAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <fieldset>
            <legend className="text-sm text-ink-soft">What came up? You can skip this.</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <label key={r} className="flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary">
                  <input type="radio" name="reason" value={r} className="sr-only" />
                  {REASON_LABEL[r]}
                </label>
              ))}
            </div>
          </fieldset>
          {late && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">It&apos;s close to the day, so this shows on your track record. Still far better than not turning up.</p>}
          <Submit>Free up my spot</Submit>
        </form>
      </Sheet>
    </div>
  );
}
