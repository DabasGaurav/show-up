"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, Search, SlidersHorizontal, X } from "lucide-react";
import { trackAction } from "@/app/actions/track";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import type { FeedFilters } from "@/lib/data/feed";
import { cn } from "@/lib/utils";

type Key = "cause" | "mode" | "dist" | "date" | "tod" | "dur" | "commit" | "open";

const chip =
  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-card px-3.5 text-sm whitespace-nowrap aria-pressed:border-brand aria-pressed:bg-info-soft aria-pressed:font-medium aria-pressed:text-brand";

/** City selector, search box and the filter chip row (§6.1 Screen 2). State lives in the URL. */
export function FilterBar({
  filters,
  activeCount,
  lockedLevels,
  today,
}: {
  filters: FeedFilters;
  activeCount: number;
  lockedLevels: string[];
  today: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<Key | null>(null);
  const [pending, start] = useTransition();
  const [q, setQ] = useState(filters.q);

  const push = (next: Partial<Record<string, string | string[]>>, logged: { filter: string; value: string }) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | string[]> = {
      city: filters.city, q: filters.q, cause: filters.causes, mode: filters.mode, dist: filters.dist, date: filters.date,
      tod: filters.tod, dur: filters.dur, commit: filters.commit, open: filters.open, ...next,
    } as Record<string, string | string[]>;
    for (const [k, v] of Object.entries(merged)) {
      const s = Array.isArray(v) ? v.join(",") : v;
      if (s) p.set(k, s);
    }
    void trackAction("filter_changed", logged);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  const single = (key: Exclude<Key, "cause">, value: string) =>
    push({ [key]: filters[key] === value ? "" : value }, { filter: key, value: filters[key] === value ? "" : value });
  const toggleCause = (c: string) => {
    const causes = filters.causes.includes(c) ? filters.causes.filter((x) => x !== c) : [...filters.causes, c];
    push({ cause: causes }, { filter: "cause", value: causes.join(",") });
  };

  const GROUPS: { key: Key; label: string; on: boolean }[] = [
    { key: "cause", label: filters.causes.length ? `Cause · ${filters.causes.length}` : "Cause", on: filters.causes.length > 0 },
    { key: "date", label: "Date", on: !!filters.date },
    { key: "mode", label: "Mode", on: !!filters.mode },
    { key: "dist", label: "Distance", on: !!filters.dist },
    { key: "tod", label: "Time of day", on: !!filters.tod },
    { key: "dur", label: "Duration", on: !!filters.dur },
    { key: "commit", label: "Commitment", on: !!filters.commit },
    { key: "open", label: "Open to", on: !!filters.open },
  ];
  const OPTIONS: Record<Exclude<Key, "cause">, { value: string; label: string; locked?: boolean }[]> = {
    mode: [{ value: "onsite", label: "On-site" }, { value: "online", label: "Online" }],
    dist: [{ value: "2", label: "≤2 km" }, { value: "5", label: "≤5 km" }, { value: "10", label: "≤10 km" }],
    date: [{ value: "today", label: "Today" }, { value: "weekend", label: "This weekend" }],
    tod: [{ value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }, { value: "evening", label: "Evening" }],
    dur: [{ value: "short", label: "≤2h" }, { value: "medium", label: "2–4h" }, { value: "long", label: "4h+" }],
    commit: [{ value: "one_off", label: "One-off" }, { value: "recurring", label: "Recurring" }],
    open: [
      { value: "everyone", label: "Everyone" },
      { value: "verified", label: "Verified", locked: lockedLevels.includes("verified") },
      { value: "trusted", label: "Trusted", locked: lockedLevels.includes("trusted") },
    ],
  };

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="feed-city">City</label>
        <select
          id="feed-city"
          value={filters.city}
          onChange={(e) => push({ city: e.target.value, dist: e.target.value === ONLINE ? "" : filters.dist }, { filter: "city", value: e.target.value })}
          className="h-11 w-36 shrink-0 rounded-lg border bg-card px-2 text-base font-medium"
        >
          {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
          <option>{ONLINE}</option>
        </select>
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            push({ q: q.trim() }, { filter: "search", value: q.trim() });
          }}
        >
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="h-11 w-full rounded-lg border bg-card pr-3 pl-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </form>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filters">
        <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="sr-only">Filters</span>
        </span>
        {GROUPS.filter((g) => !(g.key === "dist" && filters.city === ONLINE)).map((g) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={g.on}
            aria-expanded={open === g.key}
            onClick={() => setOpen(open === g.key ? null : g.key)}
            className={cn(chip, open === g.key && "ring-2 ring-brand/30")}
          >
            {g.label}
          </button>
        ))}
        {activeCount > 0 && (
          <button type="button" onClick={() => { setQ(""); setOpen(null); void trackAction("filter_changed", { filter: "clear", value: "" }); start(() => router.replace(`${pathname}?city=${encodeURIComponent(filters.city)}`, { scroll: false })); }} className={cn(chip, "text-gap")}>
            <X className="size-4" aria-hidden />
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border bg-card p-3">
          <div className="flex flex-wrap gap-2">
            {open === "cause"
              ? CAUSES.map((c) => (
                  <button key={c} type="button" aria-pressed={filters.causes.includes(c)} onClick={() => toggleCause(c)} className={chip}>
                    {c}
                  </button>
                ))
              : OPTIONS[open].map((o) => (
                  <button key={o.value} type="button" aria-pressed={filters[open] === o.value} onClick={() => single(open, o.value)} className={chip}>
                    {o.locked && <Lock className="size-3.5" aria-label="Above your level" />}
                    {o.label}
                  </button>
                ))}
            {open === "date" && (
              <label className={cn(chip, "gap-2")}>
                Pick a date
                <input
                  type="date"
                  min={today}
                  value={/^\d{4}/.test(filters.date) ? filters.date : ""}
                  onChange={(e) => push({ date: e.target.value }, { filter: "date", value: e.target.value })}
                  className="bg-transparent text-sm"
                />
              </label>
            )}
          </div>
          {open === "dist" && <p className="mt-2 text-xs text-muted-foreground">Distance from the centre of {filters.city}. On-site tasks only.</p>}
          {open === "open" && lockedLevels.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">A lock means the task needs a higher trust level than yours.</p>
          )}
        </div>
      )}
    </div>
  );
}
