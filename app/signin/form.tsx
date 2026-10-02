"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckEmail } from "@/components/check-email";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { signInAction, type SignInState } from "./actions";

export function SignInForm({ next, signUpHref }: { next: string; signUpHref: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  if (state.sent) return <CheckEmail email={state.email} link={state.link} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" hint="The one you signed up with">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <FormError message={state.error} />
      {state.unknown && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 font-medium">
          No account with that email yet. <Link href={signUpHref} className="text-primary underline underline-offset-2">Sign up</Link>
        </p>
      )}
      <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>{pending ? "Sending…" : "Email me a link"}</Button>
    </form>
  );
}
