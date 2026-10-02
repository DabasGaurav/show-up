"use client";

import { useActionState } from "react";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { unlockAction } from "./actions";

export function UnlockForm() {
  const [state, action, pending] = useActionState(unlockAction, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Team passcode" htmlFor="passcode"><TextInput id="passcode" name="passcode" type="password" autoComplete="off" autoFocus required /></Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="w-full" disabled={pending}>Open</Button>
    </form>
  );
}
