"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckEmail } from "@/components/check-email";
import { ChipChecks, Field, FormError, Select, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { signUpAction, type SignUpState } from "./actions";

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUpAction, {});
  if (state.sent) return <CheckEmail email={state.email} link={state.link} />;
  const f = state.fields ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Your name" htmlFor="name" hint="As NGOs will see it">
        <TextInput id="name" name="name" autoComplete="name" defaultValue={f.name} required />
      </Field>
      <Field label="Mobile number" htmlFor="phone" hint="NGOs only see it once you're confirmed">
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
          <TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={f.phone} required />
        </div>
      </Field>
      <Field label="Email" htmlFor="email" hint="We'll send your link and reminders here">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={f.email} required />
      </Field>
      <Field label="City" htmlFor="city">
        <Select id="city" name="city" defaultValue={f.city ?? ""} required>
          <option value="" disabled>Pick your city</option>
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          <option value={ONLINE}>I&apos;ll help online</option>
        </Select>
      </Field>
      <Field label="Causes you care about" optional><ChipChecks key={(state.causes ?? []).join()} name="causes" options={CAUSES} defaultValues={state.causes} /></Field>
      <FormError message={state.error} />
      {state.exists && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">
          You already have an account. <Link href={`/signin?next=${encodeURIComponent(next)}`} className="text-primary underline underline-offset-2">Sign in</Link>
        </p>
      )}
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Create my account"}</Button>
    </form>
  );
}
