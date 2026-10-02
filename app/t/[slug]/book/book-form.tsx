"use client";

import { useActionState } from "react";
import { FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { bookAction } from "./actions";

export function BookForm({
  slug,
  occurrenceId,
  source,
  label,
}: {
  slug: string;
  occurrenceId: string;
  source: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(bookAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="occurrence_id" value={occurrenceId} />
      <input type="hidden" name="source" value={source} />
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="w-full" disabled={pending}>
        {pending ? "Booking…" : label}
      </Button>
    </form>
  );
}
