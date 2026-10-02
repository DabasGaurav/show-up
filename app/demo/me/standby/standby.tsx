"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useDemo } from "@/components/demo/store";
import { Button } from "@/components/ui/button";
import { fmtCountdown } from "@/lib/format";

const CAUSES = ["Teaching", "Trees & green", "Food", "Animals", "Health", "Elders", "Skills & online"];
const chip = "flex min-h-11 cursor-pointer items-center rounded-full border bg-card px-4 text-sm has-checked:border-primary has-checked:bg-primary-soft has-checked:font-semibold has-checked:text-primary";

function Countdown() {
  const [left, setLeft] = useState(2 * 60 * 60 * 1000);
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{fmtCountdown(left)}</span>;
}

/** Free at short notice (brief C5), volunteer view. */
export function Standby({ days }: { days: { key: string; label: string }[] }) {
  const [demo, update] = useDemo();
  return (
    <>
      <section className="mt-5 rounded-xl bg-card p-5">
        <h2 className="text-2xl">Free at short notice?</h2>
        <p className="mt-1 text-ink-soft italic">Pick a day and we&apos;ll offer you spots that open up near you.</p>
        {demo.standbyOn ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-ok-soft px-4 py-3">
            <p className="font-semibold text-ok">You&apos;re on the list for {days[0].label}.</p>
            <Button type="button" variant="ghost" size="tap" onClick={() => update({ standbyOn: false, offer: "open" })}>Turn off</Button>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); update({ standbyOn: true }); }}>
            <fieldset>
              <legend className="text-sm font-medium">Which day?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {days.map((d, i) => (
                  <label key={d.key} className={chip}><input type="radio" name="day" defaultChecked={i === 0} className="sr-only" />{d.label}</label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Where?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Near me", "Online", "Either"].map((w, i) => (
                  <label key={w} className={chip}><input type="radio" name="area" defaultChecked={i === 0} className="sr-only" />{w}</label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">What for?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CAUSES.map((c, i) => (
                  <label key={c} className={chip}><input type="checkbox" name="cause" defaultChecked={i === 2} className="sr-only" />{c}</label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" size="tap" className="w-full">I&apos;m free at short notice</Button>
          </form>
        )}
      </section>

      {demo.standbyOn && (
        <section className="mt-4 rounded-xl bg-accent-soft p-5" aria-live="polite">
          {demo.offer === "open" ? (
            <>
              <h2 className="flex items-center gap-2 text-2xl"><Zap className="size-6 fill-accent text-accent" aria-hidden />A spot just opened!</h2>
              <p className="mt-2 font-semibold">Pack 200 ration kits · Sun 10 am · 2 km away</p>
              <p className="text-sm italic">First to say yes gets it · <Countdown /> left</p>
              <div className="mt-4 grid gap-3">
                <Button type="button" className="h-14 text-lg font-semibold" onClick={() => update({ offer: "taken" })}>I&apos;ll take it</Button>
                <Button type="button" variant="outline" className="h-14 text-lg font-semibold" onClick={() => update({ offer: "passed" })}>Not this time</Button>
              </div>
            </>
          ) : demo.offer === "taken" ? (
            <p className="font-heading text-xl font-semibold">It&apos;s yours. Annadaan Noida Circle is expecting you on Sunday.</p>
          ) : (
            <p className="font-heading text-xl font-semibold">No problem. We&apos;ll offer you the next one.</p>
          )}
        </section>
      )}
    </>
  );
}
