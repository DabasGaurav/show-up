"use client";

import { useActionState } from "react";
import { ChipChecks, Field, FormError, Select, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { saveAccountAction, type AccountState } from "./actions";

export function AccountForm({ d }: { d: { name: string; phone: string; email: string; city: string; causes: string[] } }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(saveAccountAction, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="name" hint="As NGOs will see it"><TextInput id="name" name="name" autoComplete="name" defaultValue={d.name} required /></Field>
      <Field label="Mobile number" htmlFor="phone" hint="NGOs only see it once you're confirmed">
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
          <TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={d.phone} required />
        </div>
      </Field>
      <Field label="Email" htmlFor="email" hint="You sign in with this, so it can't be changed here"><TextInput id="email" value={d.email} readOnly disabled /></Field>
      <Field label="City" htmlFor="city">
        <Select id="city" name="city" defaultValue={d.city} required>
          <option value="" disabled>Pick your city</option>
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          <option value={ONLINE}>I&apos;ll help online</option>
        </Select>
      </Field>
      <Field label="Causes you care about" optional><ChipChecks name="causes" options={CAUSES} defaultValues={d.causes} /></Field>
      <FormError message={state.error} />
      {state.ok && !pending && <p role="status" className="rounded-xl bg-primary-soft px-4 py-3 font-medium text-primary">Saved.</p>}
      <Button type="submit" size="tap" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
