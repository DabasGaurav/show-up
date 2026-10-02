import Link from "next/link";
import { CalendarCheck, Lock, PartyPopper, Search } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { HeroPeeps, OnePeep } from "@/components/art";
import { TextInput } from "@/components/forms/field";
import { Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { cardOf } from "@/lib/activity-view";
import { now } from "@/lib/clock";
import { isOtherPlace } from "@/lib/constants";
import { listUpcoming } from "@/lib/data/tasks";
import { filterCount, filterHref, filterQuery, parseFilters, toggleCause } from "@/lib/filters";
import { istDateKey, weekendDays } from "@/lib/format";
import { joinWaitlistAction } from "./actions";
import { FilterBar } from "./filter-bar";

const STEPS = [
  { icon: <Search />, text: "Pick something that fits" },
  { icon: <CalendarCheck />, text: "Say yes the day before" },
  { icon: <PartyPopper />, text: "Show up, and it counts" },
];

// Home / Explore: the list of upcoming activities is the main content.
export default async function Home(props: PageProps<"/">) {
  const f = parseFilters(await props.searchParams);
  const at = await now();
  const weekend = weekendDays(at).map(istDateKey);
  const all = await listUpcoming(at);
  const list = all.filter((a) => {
    if (f.city === "online" ? a.mode !== "online" : f.city === "other" ? a.mode !== "onsite" || !isOtherPlace(a.city) : f.city && (a.mode !== "onsite" || a.city !== f.city)) return false;
    if (f.causes.length && !f.causes.includes(a.cause)) return false;
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
        <section className="grid items-center gap-5 pt-2 pb-5 sm:grid-cols-[1.4fr_1fr] sm:gap-6 sm:py-10">
          <div>
            <h1 className="hero-title text-balance">Give a few hours. Make them count.</h1>
            <ul className="mt-4 space-y-2 font-medium">
              <li>
                <details>
                  <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                    <Tick /><span className="underline decoration-dotted underline-offset-4">Every NGO is checked by us</span>
                  </summary>
                  <p className="mt-1 ml-7 rounded-xl bg-card px-4 py-3 font-normal">Before an NGO goes live, we speak to them and check who they are.</p>
                </details>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-ink" aria-hidden><Lock className="size-3" /></span>
                Your number stays private until you&apos;re confirmed
              </li>
            </ul>
          </div>
          <HeroPeeps
            selected={f.causes}
            hrefFor={(c) => filterHref(f, toggleCause(f, c), true)}
            className="-mx-4 overflow-x-auto px-4 py-1 sm:mx-auto sm:w-full sm:max-w-sm sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
          />
        </section>

        <FilterBar f={f} today={istDateKey(at)} />

        <div id="results" className="scroll-mt-4">
          {list.length === 0 ? (
            <section className="mt-5 rounded-xl bg-card p-6 text-center">
              <OnePeep index={2} />
              <h2 className="mt-3 text-2xl">Nothing here yet.</h2>
              <form action={joinWaitlistAction} className="mx-auto mt-4 flex max-w-sm flex-col gap-2 text-left">
                <input type="hidden" name="filters" value={filterQuery(f)} />
                <label htmlFor="waitlist-email" className="text-sm font-medium">Your email</label>
                <TextInput id="waitlist-email" name="email" type="email" autoComplete="email" required />
                <Button type="submit" size="tap" className="w-full">Tell me when something&apos;s on</Button>
              </form>
              <p className="mt-4">
                <Link href="/for-ngos" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">Run an NGO? Post the first one.</Link>
              </p>
              {filterCount(f) > 0 && all.length > 0 && (
                <Link href="/#results" className="inline-flex min-h-11 items-center text-ink-soft underline underline-offset-2">Or see everything that&apos;s on</Link>
              )}
            </section>
          ) : (
            <>
              <h2 className="mt-5 text-2xl">{list.length === 1 ? "1 activity coming up" : `${list.length} activities coming up`}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {list.map((a) => (
                  <li key={a.id} className="min-w-0"><ActivityCard a={cardOf(a)} href={`/a/${a.share_slug}`} className="h-full" /></li>
                ))}
              </ul>
            </>
          )}
        </div>

        <section className="mt-10" aria-labelledby="how">
          <h2 id="how" className="text-2xl">How it works</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.text} className="flex items-center gap-3 rounded-xl bg-card p-4 font-semibold">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:size-5" aria-hidden>{s.icon}</span>
                <span><span className="text-ink-soft">{i + 1}. </span>{s.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
