"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { verifyAction, type VerifyState } from "./actions";

/** "+91 98xxxxxx12": enough for people to recognise their number. */
const mask = (phone: string) => phone.replace(/^\+91(\d{2})\d{6}(\d{2})$/, "+91 $1xxxxxx$2");

function Resend({ pending }: { pending: boolean }) {
  const [left, setLeft] = useState(30);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return left > 0 ? (
    <p className="text-center text-sm text-ink-soft">Didn&apos;t get it? Send again in 0:{String(left).padStart(2, "0")}</p>
  ) : (
    <Button type="submit" name="intent" value="resend" variant="ghost" size="tap" className="w-full" formNoValidate disabled={pending} onClick={() => setLeft(30)}>
      Send the code again
    </Button>
  );
}

export function VerifyForm({ next, needEmail, codeHint }: { next: string; needEmail: boolean; codeHint?: string }) {
  const initial: VerifyState = { step: "details", name: "", phone: "", email: "" };
  const [state, action, pending] = useActionState(verifyAction, initial);

  if (state.step === "code") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Enter the 6-digit code" htmlFor="code" hint={codeHint ?? `Sent to ${mask(state.phone)}`}>
          <TextInput
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            className="text-center text-xl tracking-[0.4em]"
          />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" name="intent" value="verify" size="tap" className="w-full" disabled={pending}>
          {pending ? "One moment…" : "Continue"}
        </Button>
        <Resend pending={pending} />
        <Button type="submit" name="intent" value="back" variant="link" className="mx-auto flex min-h-11" formNoValidate disabled={pending}>
          Use a different number
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="name" hint="As NGOs will see it">
        <TextInput id="name" name="name" autoComplete="name" defaultValue={state.name} required />
      </Field>
      <Field label="Mobile number" htmlFor="phone">
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
          <TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={state.phone} required />
        </div>
      </Field>
      {needEmail && (
        <Field label="Email" htmlFor="email" hint="For reminders, nothing else">
          <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
        </Field>
      )}
      <FormError message={state.error} />
      <Button type="submit" name="intent" value="send" size="tap" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send me a code"}
      </Button>
    </form>
  );
}
