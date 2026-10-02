"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { CauseIcon } from "@/components/cause-icon";
import { CAUSES, CITY_NAMES, ONLINE, causeColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface Filters {
  city: string;
  causes: string[];
  mode: string;
  date: string;
  len: string;
  kind: string;
}

const chip = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-4 text-sm whitespace-nowrap aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:font-semibold aria-pressed:text-primary";

/** Explore filters. What's chosen lives in the address, so a filtered list can be shared. */
export function FilterBar({ f, today }: { f: Filters; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const go = (next: Partial<Filters>) => {
    const m = { ...f, ...next };
    const p = new URLSearchParams();
    if (m.city) p.set("city", m.city);
    if (m.causes.length) p.set("cause", m.causes.join(","));
    if (m.mode) p.set("mode", m.mode);
    if (m.date) p.set("date", m.date);
    if (m.len) p.set("len", m.len);
    if (m.kind) p.set("kind", m.kind);
    start(() => router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false }));
  };
  const one = (k: "mode" | "date" | "len" | "kind", v: string, label: string) => (
    <button key={k + v} type="button" aria-pressed={f[k] === v} onClick={() => go({ [k]: f[k] === v ? "" : v })} className={chip}>{label}</button>
  );
  const any = f.city || f.causes.length || f.mode || f.date || f.len || f.kind;

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="city" className="sr-only">City</label>
        <select id="city" value={f.city} onChange={(e) => go({ city: e.target.value })} className="h-11 rounded-full border bg-card px-4 text-base font-semibold text-primary">
          <option value="">All cities</option>
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          <option>{ONLINE}</option>
        </select>
        {any ? <button type="button" onClick={() => start(() => router.replace(pathname, { scroll: false }))} className="flex min-h-11 items-center px-2 text-sm font-medium text-primary underline underline-offset-2">Clear</button> : null}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Cause">
        {CAUSES.map((c) => {
          const on = f.causes.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => go({ causes: on ? f.causes.filter((x) => x !== c) : [...f.causes, c] })}
              className={cn("flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap", on ? "border-primary font-semibold text-primary" : "bg-card")}
              style={on ? { background: causeColor(c) } : undefined}
            >
              <CauseIcon cause={c} className="size-4" />
              {c}
            </button>
          );
        })}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="More filters">
        {one("mode", "onsite", "On-site")}
        {one("mode", "online", "Online")}
        {one("date", "weekend", "This weekend")}
        <label className={cn(chip, /^\d{4}/.test(f.date) && "border-primary bg-primary-soft font-semibold text-primary")}>
          Pick a date
          <input type="date" min={today} value={/^\d{4}/.test(f.date) ? f.date : ""} onChange={(e) => go({ date: e.target.value })} className="bg-transparent text-sm" aria-label="Pick a date" />
        </label>
        {one("len", "short", "Up to 2h")}
        {one("len", "mid", "2–4h")}
        {one("len", "long", "Longer")}
        {one("kind", "once", "One-off")}
        {one("kind", "repeats", "Repeats")}
      </div>
    </div>
  );
}
