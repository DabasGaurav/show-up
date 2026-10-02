"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { snoozeNudgeAction } from "@/app/actions/volunteer";
import { trackAction } from "@/app/actions/track";
import { Button } from "@/components/ui/button";

/** Re-engagement nudge card (§6.1 Screen 6). Opening a task or "See all" is logged as nudge_opened. */
export function NudgeCard({
  text,
  seeAllHref,
  children,
}: {
  text: string;
  seeAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label="Tasks picked for you" className="rounded-xl border border-brand/25 bg-info-soft p-4">
      <h2 className="flex items-start gap-2 font-semibold text-brand">
        <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden />
        {text}
      </h2>
      <div
        className="mt-3 space-y-2"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) void trackAction("nudge_opened", { via: "task" });
        }}
      >
        {children}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={seeAllHref}
          onClick={() => void trackAction("nudge_opened", { via: "see_all" })}
          className="flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-2"
        >
          See all
        </Link>
        <form action={snoozeNudgeAction} className="ml-auto flex gap-1">
          <Button type="submit" name="how" value="not_now" variant="ghost" size="tap">Not now</Button>
          <Button type="submit" name="how" value="dismiss" variant="ghost" size="tap">Dismiss</Button>
        </form>
      </div>
    </section>
  );
}
