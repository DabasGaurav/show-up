"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, Clock, HeartHandshake, MapPin, Repeat, SlidersHorizontal } from "lucide-react";
import { CauseIcon } from "@/components/cause-icon";
import { CAUSES, CITY_NAMES, causeColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface Filters {
  city: string;
  causes: string[];
  mode: string;
  date: string;
  len: string;
  kind: string;
}

const chip = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-background px-4 text-sm whitespace-nowrap aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:font-semibold aria-pressed:text-primary";

/** One labelled group of filters: the question on the left, the choices on the right. */
function Group({ icon, label, children, className }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("gap-x-4 gap-y-2 py-3 sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-start", className)}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft sm:mb-0 sm:min-h-11 [&>svg]:size-4">{icon}{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Explore filters, grouped by the question they answer. What's chosen lives in the address, so a filtered list can be shared. */
export function FilterBar({ f, today }: { f: Filters; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const more = [f.date, f.len, f.kind].filter(Boolean).length;
  const [open, setOpen] = useState(more > 0);
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
  const picked = /^\d{4}/.test(f.date);
  const count = (f.city ? 1 : 0) + f.causes.length + (f.mode ? 1 : 0) + more;
  const hide = open ? undefined : "hidden sm:grid";

  return (
    <section aria-label="Filters" className={cn("divide-y rounded-xl bg-card px-4", pending && "opacity-70")}>
      <Group icon={<MapPin />} label="Where">
        <label htmlFor="city" className="sr-only">City</label>
        <select id="city" value={f.city} onChange={(e) => go({ city: e.target.value })} className={cn("h-11 rounded-full border bg-background px-4 text-sm", f.city && "border-primary bg-primary-soft font-semibold text-primary")}>
          <option value="">All cities</option>
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {one("mode", "onsite", "On-site")}
        {one("mode", "online", "Online")}
      </Group>

      <Group icon={<HeartHandshake />} label="Cause">
        {CAUSES.map((c) => {
          const on = f.causes.includes(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => go({ causes: on ? f.causes.filter((x) => x !== c) : [...f.causes, c] })}
              className={cn("flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap", on ? "border-primary font-semibold text-primary" : "bg-background")}
              style={on ? { background: causeColor(c) } : undefined}
            >
              <CauseIcon cause={c} className="size-4" />
              {c}
            </button>
          );
        })}
      </Group>

      <Group icon={<CalendarDays />} label="When" className={hide}>
        {one("date", "weekend", "This weekend")}
        <label className={cn(chip, picked && "border-primary bg-primary-soft font-semibold text-primary")}>
          Pick a date
          <input type="date" min={today} value={picked ? f.date : ""} onChange={(e) => go({ date: e.target.value })} className="bg-transparent text-sm" aria-label="Pick a date" />
        </label>
      </Group>

      <Group icon={<Clock />} label="How long" className={hide}>
        {one("len", "short", "Up to 2 hours")}
        {one("len", "mid", "2 to 4 hours")}
        {one("len", "long", "Half a day or more")}
      </Group>

      <Group icon={<Repeat />} label="How often" className={hide}>
        {one("kind", "once", "One-off")}
        {one("kind", "repeats", "Repeats weekly")}
      </Group>

      <div className="flex items-center justify-between gap-3 py-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-primary sm:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          {open ? "Fewer filters" : more ? `More filters · ${more} on` : "More filters: when, how long"}
        </button>
        <p className="hidden text-sm text-ink-soft sm:block">{count ? `${count} ${count === 1 ? "filter" : "filters"} on` : "Showing everything"}</p>
        {count > 0 && <button type="button" onClick={() => start(() => router.replace(pathname, { scroll: false }))} className="flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Clear all</button>}
      </div>
    </section>
  );
}
