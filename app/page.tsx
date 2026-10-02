import Link from "next/link";
import { BellRing, CalendarCheck, ClipboardList, Footprints, History, Lock, MapPinned, Quote, Undo2, UserCheck } from "lucide-react";
import { HeroArt, PackingArt, ReadingArt } from "@/components/art";
import { TrustTick } from "@/components/kit";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = "flex min-h-11 items-center rounded-full px-3 font-semibold text-primary hover:bg-primary-soft";

function Points({ items }: { items: { icon: React.ReactNode; text: string }[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((p) => (
        <li key={p.text} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary [&>svg]:size-5" aria-hidden>{p.icon}</span>
          <span className="font-medium">{p.text}</span>
        </li>
      ))}
    </ul>
  );
}

// Landing page (brief B2).
export default function LandingPage() {
  return (
    <>
      <SiteHeader>
        <Link href="/me" className={nav}>My plans</Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="grid items-center gap-8 pt-4 pb-10 sm:grid-cols-2 sm:pt-10 sm:pb-16">
          <div>
            <p className="font-semibold text-primary">Volunteering in your city</p>
            <h1 className="hero-title mt-2 text-balance">Give a few hours. Make them count.</h1>
            <p className="mt-4 max-w-md text-lg leading-7 text-ink-soft">
              Real people, real causes, close to home, and NGOs who&apos;ll be glad you came.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/ngo" className={cn(buttonVariants({ size: "tap" }), "h-13 px-7")}>I run an NGO</Link>
              <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-13 px-7")}>I&apos;m volunteering</Link>
            </div>
            <p className="mt-3 text-sm text-ink-soft italic">Got a link from an NGO? Just open it, that&apos;s all you need.</p>
          </div>
          <HeroArt className="w-full" />
        </section>

        <section aria-label="Why people trust Show-Up" className="grid gap-3 rounded-xl bg-card p-5 sm:grid-cols-3">
          <p className="flex items-center gap-3 font-medium"><TrustTick className="size-7 [&>svg]:size-4" />Every NGO is checked by us</p>
          <p className="flex items-center gap-3 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-warn" aria-hidden><Lock className="size-4" /></span>
            Your number stays private until you&apos;re confirmed
          </p>
          <p className="flex items-center gap-3 font-medium">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden><Undo2 className="size-4" /></span>
            Plans change. Telling them takes one tap.
          </p>
        </section>

        <section className="grid items-center gap-8 py-14 sm:grid-cols-2">
          <PackingArt className="w-full" />
          <div>
            <h2 className="text-3xl leading-9">Know who&apos;s really coming.</h2>
            <p className="mt-3 text-ink-soft">Post a need in two minutes and share one link in your WhatsApp group.</p>
            <p className="mt-2 text-ink-soft">See who&apos;s coming and who can&apos;t make it, before the day, not on it.</p>
            <Points
              items={[
                { icon: <ClipboardList />, text: "Clear details, so no more explaining on calls" },
                { icon: <BellRing />, text: "Reminders go out for you" },
                { icon: <History />, text: "See who's shown up before" },
              ]}
            />
            <Link href="/ngo" className={cn(buttonVariants({ size: "tap" }), "mt-6")}>Post your first need</Link>
          </div>
        </section>

        <section className="grid items-center gap-8 pb-14 sm:grid-cols-2">
          <div className="order-2 sm:order-1">
            <h2 className="text-3xl leading-9">Show up for something real.</h2>
            <p className="mt-3 text-ink-soft">Everything you need on one card: when, where, what you&apos;ll do.</p>
            <p className="mt-2 text-ink-soft">Can&apos;t make it after all? Free up your spot in one tap, and someone else gets to go.</p>
            <Points
              items={[
                { icon: <MapPinned />, text: "Exact time, place and role, upfront" },
                { icon: <BellRing />, text: "Friendly reminders, no spam" },
                { icon: <UserCheck />, text: "Your track record travels with you" },
              ]}
            />
            <Link href="/me" className={cn(buttonVariants({ size: "tap" }), "mt-6")}>See my plans</Link>
          </div>
          <ReadingArt className="order-1 w-full sm:order-2" />
        </section>

        <section aria-label="What NGOs told us" className="rounded-xl bg-accent-soft p-5 sm:p-10">
          <p className="text-sm font-semibold tracking-wide text-warn uppercase">What NGOs told us</p>
          <blockquote className="mt-3">
            <Quote className="size-7 text-accent" aria-hidden />
            <p className="font-heading mt-2 text-lg leading-7 font-semibold sm:text-3xl sm:leading-10">
              &ldquo;Maybe one in ten people actually tell me they can&apos;t continue.&rdquo;
            </p>
            <footer className="mt-3 text-sm text-ink-soft italic">An NGO founder we spoke to while building Show-Up</footer>
          </blockquote>
          <p className="mt-5 text-lg font-semibold">That&apos;s what we&apos;re here to fix.</p>
        </section>

        <section className="py-14">
          <h2 className="text-3xl leading-9">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: <CalendarCheck />, text: "Pick a spot that fits" },
              { icon: <BellRing />, text: "Say “yes” the day before" },
              { icon: <Footprints />, text: "Show up, and it counts" },
            ].map((s, i) => (
              <li key={s.text} className="flex items-center gap-4 rounded-xl bg-card p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-ink [&>svg]:size-6" aria-hidden>{s.icon}</span>
                <span className="font-heading text-lg leading-6 font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.text}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
