"use client";

import { useRef } from "react";
import { trackAction } from "@/app/actions/track";
import type { EventName } from "@/lib/events";

/** A <details> that logs the first time it is opened (evidence for the Test Lab). */
export function TrackedDetails({
  summary,
  event,
  props,
  children,
  className,
}: {
  summary: React.ReactNode;
  event: EventName;
  props: Record<string, string | number | boolean | null>;
  children: React.ReactNode;
  className?: string;
}) {
  const logged = useRef(false);
  return (
    <details
      className={className}
      onToggle={(e) => {
        if (e.currentTarget.open && !logged.current) {
          logged.current = true;
          void trackAction(event, props);
        }
      }}
    >
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand underline underline-offset-2">
        {summary}
      </summary>
      {children}
    </details>
  );
}
