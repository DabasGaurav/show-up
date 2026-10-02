"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo/store";
import { Button } from "@/components/ui/button";

/** The planning question (brief C5): shows "Saved" on submit. */
export function Planning() {
  const [demo, update] = useDemo();
  const [value, setValue] = useState("");
  return (
    <section className="mt-5 rounded-xl bg-primary-soft p-5">
      <h2 className="text-2xl leading-8">You need 15 people. How many sign-ups would you aim for?</h2>
      <form className="mt-4 flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); const n = Number(value); if (n > 0) update({ planned: n }); }}>
        <label htmlFor="planned" className="sr-only">Sign-ups you would aim for</label>
        <input id="planned" type="number" inputMode="numeric" min={1} max={200} required value={value} onChange={(e) => setValue(e.target.value)} className="h-14 w-28 rounded-xl border border-input bg-card px-4 text-center text-2xl font-bold" />
        <Button type="submit" size="tap" className="h-14 px-7 text-lg">Save</Button>
        {demo.planned !== null && <span role="status" className="font-semibold text-ok">Saved: {demo.planned}</span>}
      </form>
    </section>
  );
}
