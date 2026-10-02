"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/forms/field";

export function UnlockForm({
  action,
  label,
}: {
  action: (prev: { error?: string }, form: FormData) => Promise<{ error?: string }>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      <Field label={label} htmlFor="passcode">
        <TextInput id="passcode" name="passcode" type="password" autoComplete="off" autoFocus required />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="w-full" disabled={pending}>
        Unlock
      </Button>
    </form>
  );
}
