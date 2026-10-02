"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="tap" disabled={pending}>
      {pending ? "Saving…" : "Save rating"}
    </Button>
  );
}

/** Simple 1–5 rating with optional tags (F17). */
export function RatingForm({
  action,
  bookingId,
  tags,
  hidden,
}: {
  action: (form: FormData) => Promise<void>;
  bookingId: string;
  tags: readonly string[];
  hidden?: Record<string, string>;
}) {
  const [score, setScore] = useState(0);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="score" value={score} />
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            onClick={() => setScore(n)}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          >
            <Star className={cn("size-7", n <= score ? "fill-warn text-warn" : "text-muted-foreground/50")} aria-hidden />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <label key={t} className="flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-brand has-checked:bg-info-soft has-checked:font-medium has-checked:text-brand">
            <input type="checkbox" name="tags" value={t} className="sr-only" />
            {t}
          </label>
        ))}
      </div>
      {score > 0 ? <Submit /> : <p className="text-xs text-muted-foreground">Tap a star to rate.</p>}
    </form>
  );
}
