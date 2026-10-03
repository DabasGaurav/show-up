"use client";

import { useActionState, useEffect } from "react";
import { CheckEmail } from "@/components/check-email";
import { ChipChecks, Field, FormError, TextInput } from "@/components/forms/field";
import { PlaceField } from "@/components/forms/place-field";
import { Button } from "@/components/ui/button";
import { CAUSES } from "@/lib/constants";
import { signInAction, type SignInState } from "./actions";

/** Sign in and sign up in one form: email first, and a few details only if the person is new. */
export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  // A full page load, not an in-app move: nothing cached from before sign-in is reused.
  useEffect(() => {
    if (state.go) window.location.assign(state.go);
  }, [state.go]);
  if (state.go) {
    return (
      <p role="status" className="py-6 text-center text-lg font-semibold">
        You&apos;re in. <a href={state.go} className="text-primary underline underline-offset-2">Carry on</a>
      </p>
    );
  }
  if (state.sent) return <CheckEmail email={state.email} link={state.link} />;
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.isNew && <input type="hidden" name="step" value="details" />}
      <Field label="Email" htmlFor="email" hint="We'll send your link and reminders here">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      {state.isNew && (
        <>
          <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">You&apos;re new here. A few details and you&apos;re in.</p>
          <Field label="Your name" htmlFor="name" hint="As NGOs will see it">
            <TextInput id="name" name="name" autoComplete="name" defaultValue={f.name} required autoFocus />
          </Field>
          <Field label="City" htmlFor="city">
            <PlaceField key={state.place ?? ""} defaultValue={state.place} onlineLabel="I'll help online" />
          </Field>
          <Field label="Causes you care about" optional><ChipChecks key={(state.causes ?? []).join()} name="causes" options={CAUSES} defaultValues={state.causes} /></Field>
        </>
      )}
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>
        {pending ? "One moment…" : state.isNew ? "Create my account" : "Continue"}
      </Button>
    </form>
  );
}
