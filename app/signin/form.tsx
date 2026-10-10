"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { ChipChecks, Field, FormError, TextInput } from "@/components/forms/field";
import { PlaceField } from "@/components/forms/place-field";
import { Button } from "@/components/ui/button";
import { CAUSES } from "@/lib/constants";
import { signInAction, signUpAction, type SignInState } from "./actions";

const a = "font-semibold text-primary underline underline-offset-2";

/** After signing in or up: a full page load, so nothing cached from before is reused. */
function useGo(go: string | undefined) {
  useEffect(() => {
    if (go) window.location.assign(go);
  }, [go]);
}

function Done({ go }: { go: string }) {
  return (
    <p role="status" className="py-6 text-center text-lg font-semibold">
      You&apos;re in. <a href={go} className={a}>Carry on</a>
    </p>
  );
}

/** Sign in: email and password. */
export function SignInForm({ next, signUpHref }: { next: string; signUpHref: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  useGo(state.go);
  if (state.go) return <Done go={state.go} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </Field>
      <Field label="Password" htmlFor="password">
        <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state.error} />
      {state.hint === "new" && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">
          No account with that email yet. <Link href={signUpHref} className={a}>Create one</Link>
        </p>
      )}
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "One moment…" : "Sign in"}</Button>
      <p className="text-center text-sm text-ink-soft">Forgot your password? <Link href="/contact" className={a}>Write to us</Link></p>
    </form>
  );
}

/** Sign up to volunteer: no email to wait for. */
export function SignUpForm({ next, signInHref }: { next: string; signInHref: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signUpAction, {});
  useGo(state.go);
  if (state.go) return <Done go={state.go} />;
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Your name" htmlFor="name" hint="As NGOs will see it">
        <TextInput id="name" name="name" autoComplete="name" defaultValue={f.name} required />
      </Field>
      <Field label="Email" htmlFor="email" hint="We'll send your reminders here">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={f.email} required />
      </Field>
      <Field label="Choose a password" htmlFor="password" hint="At least 8 characters">
        <TextInput id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="City" htmlFor="city">
        <PlaceField key={state.place ?? ""} defaultValue={state.place} onlineLabel="I'll help online" />
      </Field>
      <Field label="Causes you care about" optional><ChipChecks key={(state.causes ?? []).join()} name="causes" options={CAUSES} defaultValues={state.causes} /></Field>
      <FormError message={state.error} />
      {state.hint === "existing" && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">
          You already have an account. <Link href={signInHref} className={a}>Sign in</Link>
        </p>
      )}
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "One moment…" : "Create my account"}</Button>
    </form>
  );
}
