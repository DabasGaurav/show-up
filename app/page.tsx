import Link from "next/link";
import { Lock } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { HeroPeeps, OnePeep } from "@/components/art";
import { Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cardOf } from "@/lib/activity-view";
import { now } from "@/lib/clock";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { listUpcoming } from "@/lib/data/tasks";
import { istDateKey, weekendDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FilterBar, type Filters } from "./filter-bar";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = (v: string, allowed: string[]) => (allowed.includes(v) ? v : "");

// Home / Explore: the list of upcoming activities is the main content.
export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const f: Filters = {
    city: pick(one(sp.city), [...CITY_NAMES, ONLINE]),
    causes: one(sp.cause).split(",").filter((c) => (CAUSES as readonly string[]).includes(c)),
    mode: pick(one(sp.mode), ["onsite", "online"]),
    date: /^(weekend|\d{4}-\d{2}-\d{2})$/.test(one(sp.date)) ? one(sp.date) : "",
    len: pick(one(sp.len), ["short", "mid", "long"]),
    kind: pick(one(sp.kind), ["once", "repeats"]),
  };
  const at = await now();
  const weekend = weekendDays(at).map(istDateKey);
  const all = await listUpcoming(at);
  const list = all.filter((a) => {
    if (f.city === ONLINE ? a.mode !== "online" : f.city && a.mode === "onsite" && a.city !== f.city) return false;
    if (f.causes.length && !f.causes.includes(a.cause)) return false;
    if (f.mode && a.mode !== f.mode) return false;
    const day = istDateKey(a.date_start);
    if (f.date === "weekend" ? !weekend.includes(day) : f.date && day !== f.date) return false;
    if (f.len === "short" && a.duration_min > 120) return false;
    if (f.len === "mid" && (a.duration_min <= 120 || a.duration_min > 240)) return false;
    if (f.len === "long" && a.duration_min <= 240) return false;
    if (f.kind === "once" && a.occurrences > 1) return false;
    if (f.kind === "repeats" && a.occurrences <= 1) return false;
    return true;
  });

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="grid items-center gap-6 pt-2 pb-6 sm:grid-cols-[1.4fr_1fr] sm:py-10">
          <div>
            <h1 className="hero-title text-balance">Give a few hours. Make them count.</h1>
            <ul className="mt-4 space-y-2 font-medium">
              <li className="flex items-center gap-2"><Tick />Every NGO is checked by us</li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-ink" aria-hidden><Lock className="size-3" /></span>
                Your number stays private until you&apos;re confirmed
              </li>
            </ul>
          </div>
          <HeroPeeps links className="mx-auto hidden w-full max-w-sm sm:flex" />
        </section>

        <FilterBar f={f} today={istDateKey(at)} />

        <h2 className="mt-5 text-2xl">{list.length === 1 ? "1 activity coming up" : `${list.length} activities coming up`}</h2>
        {list.length === 0 ? (
          <section className="mt-3 rounded-xl bg-card p-6 text-center">
            <OnePeep index={2} />
            <p className="mt-3 font-heading text-xl font-semibold">{all.length === 0 ? "Nothing posted yet." : "Nothing fits just yet."}</p>
            <p className="mt-1 text-ink-soft">{all.length === 0 ? "New activities from NGOs will show up here." : "Try another day, city or cause."}</p>
            {all.length > 0 && <Link href="/" className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Show everything</Link>}
          </section>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {list.map((a) => (
              <li key={a.id} className="min-w-0"><ActivityCard a={cardOf(a)} href={`/a/${a.share_slug}`} className="h-full" /></li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
