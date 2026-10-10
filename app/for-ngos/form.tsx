"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ChipChecks, Field, FormError, Select, TextArea, TextInput } from "@/components/forms/field";
import { PlaceField } from "@/components/forms/place-field";
import { Button } from "@/components/ui/button";
import { CAUSES, HEARD_FROM } from "@/lib/constants";
import { ngoSignUpAction, type NgoState } from "./actions";

const group = "text-sm font-semibold tracking-wide text-ink-soft uppercase";

/** NGO sign-up. `signedIn` people already have an email on their account. */
export function NgoForm({ signedIn, defaults }: { signedIn: boolean; defaults: { your_name: string; phone: string } }) {
  const [state, action, pending] = useActionState<NgoState, FormData>(ngoSignUpAction, {});
  const [same, setSame] = useState(true);
  useEffect(() => {
    if (state.go) window.location.assign(state.go);
  }, [state.go]);
  if (state.go) {
    return (
      <p role="status" className="py-6 text-center text-lg font-semibold">
        Thanks! <a href={state.go} className="text-primary underline underline-offset-2">Carry on</a>
      </p>
    );
  }
  const f: Record<string, string | undefined> = { ...defaults, ...state.fields };
  return (
    <form action={action} className="space-y-4">
      <p className={group}>About you</p>
      <Field label="Your name" htmlFor="your_name"><TextInput id="your_name" name="your_name" autoComplete="name" defaultValue={f.your_name} required /></Field>
      <Field label="Your role" htmlFor="role"><TextInput id="role" name="role" defaultValue={f.role} placeholder="e.g. Founder" required /></Field>
      <Field label="Phone" htmlFor="phone" hint="We'll call this number to get you live"><TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={f.phone} required /></Field>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium">
        <input type="checkbox" name="same_whatsapp" checked={same} onChange={(e) => setSame(e.target.checked)} className="size-5 accent-[#0f5257]" />
        My WhatsApp number is the same as my phone
      </label>
      {!same && (
        <Field label="WhatsApp number" htmlFor="whatsapp"><TextInput id="whatsapp" name="whatsapp" type="tel" inputMode="numeric" defaultValue={f.whatsapp} required /></Field>
      )}
      {!signedIn && (
        <>
          <Field label="Email" htmlFor="email" hint="You'll sign in with this">
            <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={f.email} required />
          </Field>
          <Field label="Choose a password" htmlFor="password" hint="At least 8 characters">
            <TextInput id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </>
      )}
      <p className={`${group} pt-2`}>About your NGO</p>
      <Field label="NGO name" htmlFor="ngo_name"><TextInput id="ngo_name" name="ngo_name" defaultValue={f.ngo_name} required /></Field>
      <Field label="City" htmlFor="city">
        <PlaceField key={state.place ?? ""} defaultValue={state.place} onlineLabel="We work online only" />
      </Field>
      <Field label="Causes"><ChipChecks key={(state.causes ?? []).join()} name="causes" options={CAUSES} defaultValues={state.causes} /></Field>
      <Field label="What you do, in a line or two" htmlFor="about" optional><TextArea id="about" name="about" defaultValue={f.about} maxLength={200} /></Field>
      <Field label="Registration number" htmlFor="registration_no" optional><TextInput id="registration_no" name="registration_no" defaultValue={f.registration_no} /></Field>
      <Field label="How did you hear about Show-Up?" htmlFor="heard_from" optional>
        <Select id="heard_from" name="heard_from" defaultValue={f.heard_from ?? ""}>
          <option value="">Choose one</option>
          {HEARD_FROM.map((h) => <option key={h}>{h}</option>)}
        </Select>
      </Field>
      <FormError message={state.error} />
      {state.exists && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">
          You already have an account. <Link href="/signin?next=/for-ngos/signup" className="text-primary underline underline-offset-2">Sign in</Link> to add your NGO.
        </p>
      )}
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Sign up my NGO"}</Button>
    </form>
  );
}
