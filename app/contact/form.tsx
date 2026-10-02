"use client";

import { useActionState } from "react";
import { Field, FormError, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { contactAction, type ContactState } from "./actions";

export function ContactForm({ defaults }: { defaults: { name: string; email: string } }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  const f = { ...defaults, message: "", ...state.fields };
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" htmlFor="name"><TextInput id="name" name="name" autoComplete="name" defaultValue={f.name} required /></Field>
      <Field label="Email" htmlFor="email" hint="So we can write back"><TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={f.email} required /></Field>
      <Field label="Your message" htmlFor="message"><TextArea id="message" name="message" defaultValue={f.message} maxLength={2000} className="min-h-36" required /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <FormError message={state.error} />
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
    </form>
  );
}
