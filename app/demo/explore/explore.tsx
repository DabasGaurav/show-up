"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { EmptyArt } from "@/components/art";
import { CauseIcon } from "@/components/cause-icon";
import { useDemo } from "@/components/demo/store";
import { Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { causeUi } from "@/lib/constants";
import { toCard, type DemoActivity } from "@/lib/demo";
import { istDateKey, istHour } from "@/lib/format";
import { cn } from "@/lib/utils";

const CAUSES = ["Teaching", "Plantation", "Food distribution", "Animal welfare", "Health camps", "Elderly care", "Skill-based"];
const chip = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 text-sm whitespace-nowrap aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:font-semibold aria-pressed:text-primary";

type Filters = { where: string; when: string; date: string; tod: string; len: string; kind: string };
const NONE: Filters = { where: "", when: "", date: "", tod: "", len: "", kind: "" };

/** Explore (brief C1): cause chips, one filter row, activity cards. */
export function Explore({ activities, weekend }: { activities: DemoActivity[]; weekend: string[] }) {
  const [demo] = useDemo();
  const [causes, setCauses] = useState<string[]>([]);
  const [f, setF] = useState<Filters>(NONE);
  const toggle = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: p[k] === v ? "" : v, ...(k === "when" ? { date: "" } : {}) }));

  const shown = activities.filter((a) => {
    if (a.onlyInPick) return false;
    if (causes.length && !causes.includes(a.cause)) return false;
    if (f.where === "near" && !a.near) return false;
    if (f.where === "online" && a.mode !== "online") return false;
    const day = istDateKey(a.startAt);
    if (f.when === "weekend" && !weekend.includes(day)) return false;
    if (f.date && day !== f.date) return false;
    const h = istHour(a.startAt);
    if (f.tod === "morning" && h >= 12) return false;
    if (f.tod === "afternoon" && (h < 12 || h >= 17)) return false;
    if (f.tod === "evening" && h < 17) return false;
    if (f.len === "short" && a.minutes > 120) return false;
    if (f.len === "mid" && (a.minutes <= 120 || a.minutes > 240)) return false;
    if (f.len === "long" && a.minutes <= 240) return false;
    if (f.kind === "once" && a.regular) return false;
    if (f.kind === "regular" && !a.regular) return false;
    return true;
  });
  const any = causes.length > 0 || Object.values(f).some(Boolean);
  const b = (k: keyof Filters, v: string, label: string) => (
    <button key={`${k}:${v}`} type="button" aria-pressed={f[k] === v} onClick={() => toggle(k, v)} className={chip}>{label}</button>
  );

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Causes">
        {CAUSES.map((c) => {
          const on = causes.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => setCauses((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
              className={cn("flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm", on ? "border-primary font-semibold text-primary" : "bg-card")}
              style={on ? { background: causeUi(c).color } : undefined}
            >
              <CauseIcon cause={c} className="size-4" />
              {causeUi(c).label}
            </button>
          );
        })}
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filters">
        {b("where", "near", "Near me")}
        {b("where", "online", "Online")}
        {b("when", "weekend", "This weekend")}
        <label className={cn(chip, f.date && "border-primary bg-primary-soft font-semibold text-primary")}>
          Pick a date
          <input type="date" value={f.date} onChange={(e) => setF((p) => ({ ...p, date: e.target.value, when: "" }))} className="bg-transparent text-sm" aria-label="Pick a date" />
        </label>
        {b("tod", "morning", "Morning")}
        {b("tod", "afternoon", "Afternoon")}
        {b("tod", "evening", "Evening")}
        {b("len", "short", "Up to 2h")}
        {b("len", "mid", "2–4h")}
        {b("len", "long", "Longer")}
        {b("kind", "once", "One-off")}
        {b("kind", "regular", "Regular")}
      </div>

      <p className="mt-4 font-semibold" aria-live="polite">{shown.length} {shown.length === 1 ? "activity matches" : "activities match"}</p>

      {shown.length === 0 ? (
        <section className="mt-3 rounded-xl bg-card p-6 text-center">
          <EmptyArt />
          <p className="mt-3 font-heading text-xl font-semibold">Nothing fits just yet.</p>
          <Button type="button" size="tap" className="mt-4" onClick={() => { setCauses([]); setF(NONE); }}>Show everything</Button>
        </section>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((a) => (
            <li key={a.slug} className="min-w-0">
              <ActivityCard
                a={toCard(a, demo.saved.includes(a.slug))}
                href={`/demo/a/${a.slug}`}
                className="h-full"
                right={demo.saved.includes(a.slug) ? <Pill tone="blue">Saved</Pill> : undefined}
              />
            </li>
          ))}
        </ul>
      )}
      {any && shown.length > 0 && (
        <button type="button" onClick={() => { setCauses([]); setF(NONE); }} className="mt-4 flex min-h-11 items-center font-medium text-primary underline underline-offset-2">Clear my choices</button>
      )}
    </>
  );
}

/** SH2: three similar activities side by side. */
export function PickOne({ activities }: { activities: DemoActivity[] }) {
  const [demo] = useDemo();
  return (
    <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
      {activities.map((a) => (
        <li key={a.slug} className="min-w-0">
          <ActivityCard a={toCard(a, demo.saved.includes(a.slug))} href={`/demo/a/${a.slug}`} className="h-full" right={demo.saved.includes(a.slug) ? <Pill tone="blue">Saved</Pill> : undefined} />
        </li>
      ))}
    </ul>
  );
}
