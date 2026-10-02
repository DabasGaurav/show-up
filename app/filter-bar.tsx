import Link from "next/link";
import { CalendarDays, ChevronDown, Clock, HeartHandshake, MapPin, Repeat, SlidersHorizontal } from "lucide-react";
import { CauseIcon } from "@/components/cause-icon";
import { CAUSES, CITY_NAMES, causeColor } from "@/lib/constants";
import { filterCount, filterHref, toggleCause, type Filters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { DatePick } from "./date-pick";

const chip = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border bg-background px-4 text-sm whitespace-nowrap";
const on = "border-primary bg-primary-soft font-semibold text-primary";

/** One labelled group of filters: the question on the left, the choices on the right. */
function Group({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="gap-x-4 gap-y-2 py-3 sm:grid sm:grid-cols-[8.5rem_1fr] sm:items-start">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-soft sm:mb-0 sm:min-h-11 [&>svg]:size-4">{icon}{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Explore filters, grouped by the question they answer. Every choice is a plain
 * link, so it works before the page's scripts load, and the address always says
 * what is chosen.
 */
export function FilterBar({ f, today }: { f: Filters; today: string }) {
  const count = filterCount(f);
  const one = (k: "city" | "date" | "len" | "kind", v: string, label: string) => (
    <Link key={k + v} href={filterHref(f, { [k]: f[k] === v ? "" : v })} scroll={false} aria-current={f[k] === v ? "true" : undefined} className={cn(chip, f[k] === v && on)}>{label}</Link>
  );
  const picked = /^\d{4}/.test(f.date);

  return (
    <details open={count > 0} className="group rounded-xl bg-card px-4" aria-label="Filters">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-5 text-primary" aria-hidden />
        Filters
        <span className="text-sm font-medium text-ink-soft">{count ? `${count} on` : "place, cause, date and more"}</span>
        <ChevronDown className="ml-auto size-5 text-primary transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="divide-y border-t">
        <Group icon={<MapPin />} label="Where">
          {CITY_NAMES.map((c) => one("city", c, c))}
          {one("city", "other", "Other places")}
          {one("city", "online", "Online")}
        </Group>

        <Group icon={<HeartHandshake />} label="Cause">
          {CAUSES.map((c) => {
            const sel = f.causes.includes(c);
            return (
              <Link
                key={c}
                href={filterHref(f, toggleCause(f, c), true)}
                aria-current={sel ? "true" : undefined}
                className={cn(chip, sel && "border-primary font-semibold text-primary")}
                style={sel ? { background: causeColor(c) } : undefined}
              >
                <CauseIcon cause={c} className="size-4" />
                {c}
              </Link>
            );
          })}
        </Group>

        <Group icon={<CalendarDays />} label="When">
          {one("date", "weekend", "This weekend")}
          <DatePick value={picked ? f.date : ""} min={today} hrefFor={filterHref(f, { date: "DATE" })} className={cn(chip, picked && on)} />
        </Group>

        <Group icon={<Clock />} label="How long">
          {one("len", "short", "Up to 2 hours")}
          {one("len", "mid", "2 to 4 hours")}
          {one("len", "long", "Half a day or more")}
        </Group>

        <Group icon={<Repeat />} label="How often">
          {one("kind", "once", "One-off")}
          {one("kind", "repeats", "Repeats weekly")}
        </Group>

        {count > 0 && (
          <p className="py-1 text-right">
            <Link href="/" scroll={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">Clear all</Link>
          </p>
        )}
      </div>
    </details>
  );
}
