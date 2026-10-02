"use client";

import { useActionState } from "react";
import { CheckEmail } from "@/components/check-email";
import { ChipChecks, Field, FormError, Select, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { signInAction, type SignInState } from "./actions";

/** Sign in and sign up in one form: email first, and a few details only if the person is new. */
export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
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
          <Field label="Mobile number" htmlFor="phone" hint="NGOs only see it once you're confirmed">
            <div className="flex gap-2">
              <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
              <TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={f.phone} required />
            </div>
          </Field>
          <Field label="City" htmlFor="city">
            <Select id="city" name="city" defaultValue={f.city ?? ""} required>
              <option value="" disabled>Pick your city</option>
              {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
              <option value={ONLINE}>I&apos;ll help online</option>
            </Select>
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
