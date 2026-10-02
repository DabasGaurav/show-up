"use client";

import { Camera, ShieldCheck } from "lucide-react";
import { useDemo } from "@/components/demo/store";
import { Button } from "@/components/ui/button";

const IDS = ["Aadhaar", "PAN", "Driving licence", "Passport"];
const chip = "flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary";

/** Get your ID checked (brief C6). The photo step is a placeholder: nothing is uploaded. */
export function GetChecked() {
  const [demo, update] = useDemo();
  const step = demo.checked;
  return (
    <section className="mt-5 rounded-xl bg-card p-5" aria-live="polite">
      {step === 0 && (
        <form onSubmit={(e) => { e.preventDefault(); update({ checked: 1 }); }} className="space-y-4">
          <fieldset>
            <legend className="font-semibold">1. Choose an ID</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {IDS.map((id, i) => <label key={id} className={chip}><input type="radio" name="id" defaultChecked={i === 0} className="sr-only" />{id}</label>)}
            </div>
          </fieldset>
          <Button type="submit" size="tap" className="w-full">Next</Button>
        </form>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <p className="font-semibold">2. Snap a photo</p>
          <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted text-ink-soft">
            <Camera className="size-8" aria-hidden />
            <span className="text-sm">Demo: nothing is uploaded</span>
          </div>
          <Button type="button" size="tap" className="w-full" onClick={() => update({ checked: 2 })}>Use this photo</Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="font-heading text-2xl font-semibold">We&apos;re checking. Usually within a day.</p>
          <Button type="button" size="tap" variant="outline" className="w-full" onClick={() => update({ checked: 3 })}>Demo: skip the wait</Button>
        </div>
      )}
      {step === 3 && (
        <p className="flex items-center gap-2 font-heading text-2xl font-semibold text-primary"><ShieldCheck className="size-7" aria-hidden />You&apos;re checked ✓</p>
      )}
    </section>
  );
}
