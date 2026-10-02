"use client";

import { useActionState } from "react";
import { ChipChecks, Field, FormError, Select, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { ngoSignUpAction, type NgoState } from "./actions";

export function NgoForm({ defaults }: { defaults: { your_name: string; phone: string } }) {
  const [state, action, pending] = useActionState<NgoState, FormData>(ngoSignUpAction, {});
  const f: Record<string, string | undefined> = { ...defaults, ...state.fields };
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="your_name"><TextInput id="your_name" name="your_name" defaultValue={f.your_name} required /></Field>
      <Field label="Your role" htmlFor="role"><TextInput id="role" name="role" defaultValue={f.role} placeholder="e.g. Founder" required /></Field>
      <Field label="Phone" htmlFor="phone" hint="We'll call this number to get you live"><TextInput id="phone" name="phone" type="tel" inputMode="numeric" defaultValue={f.phone} required /></Field>
      <Field label="NGO name" htmlFor="ngo_name"><TextInput id="ngo_name" name="ngo_name" defaultValue={f.ngo_name} required /></Field>
      <Field label="City" htmlFor="city">
        <Select id="city" name="city" defaultValue={f.city ?? ""} required>
          <option value="" disabled>Pick your city</option>
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Causes"><ChipChecks name="causes" options={CAUSES} /></Field>
      <Field label="What you do, in a line or two" htmlFor="about" optional><TextArea id="about" name="about" defaultValue={f.about} maxLength={200} /></Field>
      <Field label="Registration number" htmlFor="registration_no" optional><TextInput id="registration_no" name="registration_no" defaultValue={f.registration_no} /></Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
    </form>
  );
}
