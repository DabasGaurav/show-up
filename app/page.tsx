import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, ClipboardList, Lock, PartyPopper, Search } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { OnePeep } from "@/components/art";
import { CauseImage } from "@/components/cause-image";
import { TextInput } from "@/components/forms/field";
import { Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cardOf } from "@/lib/activity-view";
import { now } from "@/lib/clock";
import { CAUSES, CITY_NAMES, isOtherPlace, urlSlug } from "@/lib/constants";
import { listUpcoming } from "@/lib/data/tasks";
import { filterCount, filterHref, filterQuery, parseFilters, toggleCause } from "@/lib/filters";
import { istDateKey, weekendDays } from "@/lib/format";
import { cn } from "@/lib/utils";
import { joinWaitlistAction } from "./actions";
import { FilterBar } from "./filter-bar";

const STEPS = [
  { icon: <Search />, title: "Pick something that fits", text: "Filter by city, cause, date and how much time you have." },
  { icon: <CalendarCheck />, title: "Say yes the day before", text: "We check in two days ahead. One tap tells the NGO you're coming." },
  { icon: <PartyPopper />, title: "Show up, and it counts", text: "The NGO marks who came, and your track record grows." },
];

const PROMISES = [
  { icon: <BadgeCheck />, title: "Checked NGOs", text: "Before an NGO goes live, we speak to them and check who they are." },
  { icon: <ClipboardList />, title: "Clear plans", text: "Every activity says what you'll do, when, where, and when you're done." },
  { icon: <Lock />, title: "Your number stays private", text: "An NGO sees it only once your spot is confirmed." },
];

const FAQ = [
  { q: "Does it cost anything?", a: "No. Show-Up is free for volunteers and for NGOs." },
  { q: "What if my plans change?", a: "Tap \"I can't make it\". Do it a day ahead and nothing goes on your track record." },
  { q: "Do I need experience?", a: "No. Each activity says exactly what you'll do. The NGO shows you the rest on the day." },
  { q: "Can I help from home?", a: "Yes. Pick Online under Where to see activities you can do from anywhere." },
];

const select = "h-12 w-full min-w-0 rounded-xl border border-input bg-card px-4 text-base";

// Home / Explore: what Show-Up is, then the list of upcoming activities.
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
  const perCause = (c: string) => all.filter((a) => a.cause === c).length;
  const ngos = new Set(all.map((a) => a.org_id)).size;
  const places = new Set(all.filter((a) => a.mode === "onsite").map((a) => a.city)).size;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="grid items-center gap-6 pt-6 pb-6 sm:grid-cols-[1.15fr_1fr] sm:gap-10 sm:py-12">
          <div>
            <p className="eyebrow">Real NGOs. A few hours. It counts.</p>
            <h1 className="hero-title mt-3 text-balance">Give a few hours. Make them count.</h1>
            <p className="mt-4 max-w-md text-lg leading-7 text-ink-soft">Find a volunteering activity that fits your week. Save your spot, then turn up.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#results" className={cn(buttonVariants({ size: "tap" }), "h-14 px-7 text-lg")}>Explore activities</Link>
              <Link href="/for-ngos" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-14 bg-card px-7 text-lg")}>For NGOs</Link>
            </div>
            <ul className="mt-6 space-y-2 font-medium">
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
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Image src="/causes/hero.jpg" alt="Volunteers arriving at a community centre" fill priority sizes="(min-width: 640px) 460px, 100vw" className="object-cover" />
          </div>
        </section>

        {/* Quick find: a plain form, so it works before the page's scripts load. */}
        <form action="/#results" className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-card sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="q-city" className="sr-only">Where</label>
            <select id="q-city" name="city" defaultValue={f.city ? urlSlug(f.city) : ""} className={select}>
              <option value="">Anywhere</option>
              {CITY_NAMES.map((c) => <option key={c} value={urlSlug(c)}>{c}</option>)}
              <option value="other">Other places</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label htmlFor="q-cause" className="sr-only">Cause</label>
            <select id="q-cause" name="cause" defaultValue={f.causes.length === 1 ? urlSlug(f.causes[0]) : ""} className={select}>
              <option value="">Any cause</option>
              {CAUSES.map((c) => <option key={c} value={urlSlug(c)}>{c}</option>)}
            </select>
          </div>
          <Button type="submit" size="tap" className="h-12 px-6">Find activities</Button>
        </form>

        {all.length > 0 && (
          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[[all.length, all.length === 1 ? "activity coming up" : "activities coming up"], [ngos, ngos === 1 ? "checked NGO" : "checked NGOs"], [places, places === 1 ? "city, plus online" : "cities and towns"]].map(([n, label]) => (
              <div key={label} className="rounded-xl bg-primary-soft px-2 py-4">
                <dt className="font-heading text-3xl font-bold text-primary">{n}</dt>
                <dd className="text-sm font-medium">{label}</dd>
              </div>
            ))}
          </dl>
        )}

        <section className="mt-12" aria-labelledby="causes">
          <p className="eyebrow">Browse by cause</p>
          <h2 id="causes" className="mt-2 text-3xl leading-9">What do you care about?</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CAUSES.map((c) => {
              const sel = f.causes.includes(c);
              const n = perCause(c);
              return (
                <li key={c}>
                  <Link href={filterHref(f, toggleCause(f, c), true)} aria-current={sel ? "true" : undefined} className={cn("group relative block overflow-hidden rounded-xl", sel && "ring-4 ring-primary ring-offset-2 ring-offset-background")}>
                    <CauseImage cause={c} sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw" className="aspect-[4/3] transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" aria-hidden />
                    <span className="absolute inset-x-3 bottom-2.5 text-white">
                      <span className="block font-heading text-xl leading-6 font-semibold">{c}</span>
                      <span className="text-sm">{n === 0 ? "Nothing yet" : n === 1 ? "1 activity" : `${n} activities`}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="results" className="mt-12 scroll-mt-4" aria-labelledby="list">
          <p className="eyebrow">Coming up</p>
          <h2 id="list" className="mt-2 mb-4 text-3xl leading-9">
            {list.length === 0 ? "Nothing here yet." : list.length === 1 ? "1 activity you can join" : `${list.length} activities you can join`}
          </h2>
          <FilterBar f={f} today={istDateKey(at)} />
          {list.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border/70 bg-card p-6 text-center shadow-card">
              <OnePeep index={2} />
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
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {list.map((a) => (
                <li key={a.id} className="min-w-0"><ActivityCard a={cardOf(a)} href={`/a/${a.share_slug}`} className="h-full" /></li>
              ))}
            </ul>
          )}
        </section>

        <section id="how" className="mt-14 scroll-mt-4" aria-labelledby="how-title">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="mt-2 text-3xl leading-9">Three simple steps</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-border/70 bg-card p-5 shadow-card">
                <p className="flex items-center gap-2.5">
                  <span className="font-heading text-3xl font-semibold text-warn">{i + 1}</span>
                  <span className="text-primary [&>svg]:size-6" aria-hidden>{s.icon}</span>
                </p>
                <h3 className="mt-3 text-xl leading-7">{s.title}</h3>
                <p className="mt-1 text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-3xl bg-primary-soft p-6 sm:p-8" aria-label="What you can count on">
          <ul className="grid gap-6 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title}>
                <span className="text-warn [&>svg]:size-7" aria-hidden>{p.icon}</span>
                <h3 className="mt-2 text-xl leading-7">{p.title}</h3>
                <p className="mt-1">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="faq">
          <p className="eyebrow">Good to know</p>
          <h2 id="faq" className="mt-2 text-3xl leading-9">Questions people ask</h2>
          <ul className="mt-5 divide-y rounded-xl border border-border/70 bg-card px-5 shadow-card">
            {FAQ.map((x) => (
              <li key={x.q}>
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
                    {x.q}<span className="text-2xl leading-none text-primary transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="pb-4 text-ink-soft">{x.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-3xl bg-primary p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-10" aria-labelledby="ngo-cta">
          <div>
            <h2 id="ngo-cta" className="text-3xl leading-9">Run an NGO?</h2>
            <p className="mt-2 max-w-md text-white/85">Post an activity, share one link, and see who&apos;s coming before the day.</p>
          </div>
          <Link href="/for-ngos" className="mt-5 inline-flex h-14 shrink-0 items-center rounded-full bg-accent px-7 text-lg font-semibold text-ink hover:bg-accent/90 sm:mt-0">Sign up your NGO</Link>
        </section>
      </main>
    </>
  );
}
