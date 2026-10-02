"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChipChecks, Field, FormError, Select, TextArea, TextInput } from "@/components/forms/field";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { joinAction, type JoinState } from "./actions";

export function JoinForm({
  needInvite,
  registrationOptional,
  defaults,
}: {
  needInvite: boolean;
  registrationOptional: boolean;
  defaults: { contact_name: string; contact_phone: string };
}) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinAction, {});
  const f: Record<string, string | undefined> = { ...defaults, ...state.fields };
  return (
    <form action={action} className="space-y-5">
      {needInvite && (
        <Field label="Invite code" htmlFor="invite_code" hint="Sent to partner NGOs by the Show-Up team.">
          <TextInput id="invite_code" name="invite_code" defaultValue={f.invite_code} autoCapitalize="characters" required />
        </Field>
      )}
      <Field label="NGO name" htmlFor="name">
        <TextInput id="name" name="name" defaultValue={f.name} required />
      </Field>
      <Field label="City" htmlFor="city">
        <Select id="city" name="city" defaultValue={f.city ?? ""} required>
          <option value="" disabled>
            Choose a city
          </option>
          {CITY_NAMES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Causes">
        <ChipChecks name="causes" options={CAUSES} />
      </Field>
      <Field label="Contact person" htmlFor="contact_name">
        <TextInput id="contact_name" name="contact_name" defaultValue={f.contact_name} required />
      </Field>
      <Field label="Contact phone" htmlFor="contact_phone">
        <TextInput id="contact_phone" name="contact_phone" type="tel" defaultValue={f.contact_phone} required />
      </Field>
      <Field
        label="Registration number"
        htmlFor="registration_no"
        optional={registrationOptional}
        hint="Trust, society or Section 8 registration. We check it before your tasks go live."
      >
        <TextInput id="registration_no" name="registration_no" defaultValue={f.registration_no} required={!registrationOptional} />
      </Field>
      <Field label="12A / 80G number" htmlFor="tax_12a_80g" optional>
        <TextInput id="tax_12a_80g" name="tax_12a_80g" defaultValue={f.tax_12a_80g} />
      </Field>
      <Field label="About your NGO" htmlFor="about" optional hint="Two lines volunteers will see.">
        <TextArea id="about" name="about" defaultValue={f.about} maxLength={280} />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send for approval"}
      </Button>
    </form>
  );
}
