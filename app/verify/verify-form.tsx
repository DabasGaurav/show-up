"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { fmtPhone } from "@/lib/format";
import { verifyAction, type VerifyState } from "./actions";

export function VerifyForm({
  next,
  needEmail,
  codeHint,
}: {
  next: string;
  needEmail: boolean;
  codeHint: string;
}) {
  const initial: VerifyState = { step: "details", name: "", phone: "", email: "" };
  const [state, action, pending] = useActionState(verifyAction, initial);

  if (state.step === "code") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <p className="text-sm">
          We sent a 6-digit code to <strong>{fmtPhone(state.phone)}</strong>.
        </p>
        <Field label="Enter code" htmlFor="code" hint={codeHint}>
          <TextInput
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6 digits"
            autoFocus
            required
            className="text-center text-lg tracking-[0.4em]"
          />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" name="intent" value="verify" size="tap" className="w-full" disabled={pending}>
          {pending ? "Checking…" : "Confirm phone"}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="back"
          variant="ghost"
          size="tap"
          className="w-full"
          formNoValidate
          disabled={pending}
        >
          Change number
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="name">
        <TextInput id="name" name="name" autoComplete="name" defaultValue={state.name} required />
      </Field>
      <Field label="Mobile number" htmlFor="phone" hint="Indian mobile, 10 digits.">
        <div className="flex gap-2">
          <span className="flex h-11 items-center rounded-lg border bg-muted px-3 text-base">+91</span>
          <TextInput
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            defaultValue={state.phone}
            placeholder="98765 43210"
            required
          />
        </div>
      </Field>
      {needEmail && (
        <Field label="Email" htmlFor="email" hint="We send booking reminders here.">
          <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
        </Field>
      )}
      <FormError message={state.error} />
      <Button type="submit" name="intent" value="send" size="tap" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
