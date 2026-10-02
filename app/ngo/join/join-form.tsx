"use client";

import { useActionState, useState } from "react";
import { ChipChecks, Field, FormError, Select, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { joinAction, type JoinState } from "./actions";

const STEPS = ["About you", "Your NGO", "Invite code"];

/** NGO onboarding in three short steps (brief B7). */
export function JoinForm({ needInvite, defaults }: { needInvite: boolean; defaults: { contact_name: string; contact_phone: string } }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinAction, {});
  const [picked, setPicked] = useState<{ step: number; forState: JoinState }>({ step: 1, forState: state });
  // A problem found on the server takes the person back to the step it is on.
  const step = picked.forState === state ? picked.step : (state.step ?? picked.step);
  const go = (n: number) => setPicked({ step: n, forState: state });
  const f: Record<string, string | undefined> = { ...defaults, ...state.fields };
  const last = STEPS.length;

  return (
    <form action={action} className="space-y-5">
      <ol className="flex items-center gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={step === i + 1 ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", i + 1 <= step ? "bg-primary" : "bg-border")} />
            <span className={cn("text-sm", step === i + 1 ? "font-semibold text-primary" : "text-ink-soft")}>{i + 1} · {s}</span>
          </li>
        ))}
      </ol>

      <div className={cn("space-y-4", step !== 1 && "hidden")}>
        <Field label="Your name" htmlFor="contact_name"><TextInput id="contact_name" name="contact_name" defaultValue={f.contact_name} /></Field>
        <Field label="Your role" htmlFor="contact_role"><TextInput id="contact_role" name="contact_role" defaultValue={f.contact_role} placeholder="e.g. Founder" /></Field>
        <Field label="Phone" htmlFor="contact_phone"><TextInput id="contact_phone" name="contact_phone" type="tel" inputMode="numeric" defaultValue={f.contact_phone} /></Field>
      </div>

      <div className={cn("space-y-4", step !== 2 && "hidden")}>
        <Field label="NGO name" htmlFor="name"><TextInput id="name" name="name" defaultValue={f.name} /></Field>
        <Field label="City" htmlFor="city">
          <Select id="city" name="city" defaultValue={f.city ?? ""}>
            <option value="" disabled>Pick your city</option>
            {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="What you work on"><ChipChecks name="causes" options={CAUSES} /></Field>
        <Field label="Registration number" htmlFor="registration_no" hint="Optional for now, it helps us add your trust tick">
          <TextInput id="registration_no" name="registration_no" defaultValue={f.registration_no} />
        </Field>
      </div>

      <div className={cn("space-y-4", step !== 3 && "hidden")}>
        <Field label="Invite code" htmlFor="invite_code" hint={needInvite ? "Got one from our team? Pop it in." : "Got one from our team? Pop it in. You can leave this empty."}>
          <TextInput id="invite_code" name="invite_code" defaultValue={f.invite_code} autoCapitalize="characters" />
        </Field>
      </div>

      <FormError message={state.error} />
      <div className="flex gap-3">
        {step > 1 && <Button type="button" variant="outline" size="tap" onClick={() => go(step - 1)}>Back</Button>}
        {step < last ? (
          <Button type="button" size="tap" className="flex-1" onClick={() => go(step + 1)}>Next</Button>
        ) : (
          <Button type="submit" size="tap" className="flex-1" disabled={pending}>{pending ? "Sending…" : "Finish"}</Button>
        )}
      </div>
    </form>
  );
}
