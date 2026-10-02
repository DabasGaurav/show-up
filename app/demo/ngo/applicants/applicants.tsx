"use client";

import { useDemo } from "@/components/demo/store";
import { Avatar, LevelMark, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import type { DemoApplicant } from "@/lib/demo";
import { cn } from "@/lib/utils";

function Dots({ dots }: { dots: string }) {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[...dots].map((d, i) => (
        <span key={i} className={cn("size-2.5 rounded-full", d === "c" && "bg-primary", d === "f" && "bg-released-fill", d === "m" && "border-2 border-gap")} />
      ))}
    </span>
  );
}

/** People who joined (brief C4): five rows, Accept / Not this time, then a summary. */
export function Applicants({ people }: { people: DemoApplicant[] }) {
  const [demo, update] = useDemo();
  const decided = people.filter((p) => demo.decisions[p.id]).length;
  const accepted = people.filter((p) => demo.decisions[p.id] === "accept").length;
  return (
    <>
      <ul className="mt-5 space-y-3">
        {people.map((p) => {
          const d = demo.decisions[p.id];
          return (
            <li key={p.id} className="rounded-xl bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar name={p.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{p.name}<LevelMark level={p.level} /></p>
                    {d && <Pill tone={d === "accept" ? "green" : "grey"}>{d === "accept" ? "Accepted" : "Not this time"}</Pill>}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    {p.of > 0 ? (
                      <><Dots dots={p.dots} /><span className="font-medium">Came {p.came} of {p.of} times{p.extra ? ` · ${p.extra}` : ""}</span></>
                    ) : (
                      <span className="text-ink-soft">No history yet</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{[p.note && `NGOs said: ${p.note}`, p.joined].filter(Boolean).join(" · ")}</p>
                  {p.paused && <p className="mt-1 text-sm font-medium text-gap">{p.paused}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" size="tap" variant={d === "accept" ? "default" : "outline"} aria-pressed={d === "accept"} onClick={() => update({ decisions: { ...demo.decisions, [p.id]: "accept" } })}>Accept</Button>
                <Button type="button" size="tap" variant={d === "decline" ? "default" : "outline"} aria-pressed={d === "decline"} onClick={() => update({ decisions: { ...demo.decisions, [p.id]: "decline" } })}>Not this time</Button>
              </div>
            </li>
          );
        })}
      </ul>
      {decided === people.length && (
        <p role="status" className="mt-4 rounded-xl bg-ok-soft p-4 font-semibold text-ok">
          You&apos;ve accepted {accepted}. They&apos;ll get a message now.
        </p>
      )}
    </>
  );
}
