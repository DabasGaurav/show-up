"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { signInAction, type SignInState } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  if (state.sent) {
    return (
      <div role="status" className="text-center">
        <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="mt-3 text-2xl">Check your email.</h2>
        <p className="mt-1 text-ink-soft">We sent a link to {state.email}. Tap it to carry on.</p>
        {state.link && (
          <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm">
            No email is set up on this computer, so here it is: <a href={state.link} className="font-semibold text-primary underline underline-offset-2">open my link</a>
          </p>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Your name" htmlFor="name" hint="As NGOs will see it">
        <TextInput id="name" name="name" autoComplete="name" defaultValue={state.fields?.name} required />
      </Field>
      <Field label="Mobile number" htmlFor="phone">
        <div className="flex gap-2">
          <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
          <TextInput id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" defaultValue={state.fields?.phone} required />
        </div>
      </Field>
      <Field label="Email" htmlFor="email" hint="We'll send your link and reminders here">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Email me a link"}</Button>
    </form>
  );
}
