import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { EmptyArt } from "@/components/art";
import { BookingCard } from "@/components/booking-card";
import { LevelMark, TrackRecord } from "@/components/kit";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { bookingFacts, isActive, listBookingsForUser } from "@/lib/data/bookings";
import { ratedBookingIds } from "@/lib/data/org-profile";
import { isEnabled } from "@/lib/flags";
import { fmtDayDate } from "@/lib/format";
import { trackRecord } from "@/lib/labels";
import { pausedUntil, trustLevel } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { signOutAction } from "../verify/actions";
import { MeExtras } from "./extras";

export const metadata: Metadata = { title: "My plans" };

// My plans (brief B6).
export default async function MyPlansPage(props: PageProps<"/me">) {
  const user = await requireUser("/me");
  const { booked, tab } = await props.searchParams;
  const at = await tick();
  const [bookings, facts] = await Promise.all([listBookingsForUser(user.id), bookingFacts(user.id)]);

  const comingUp = bookings
    .filter((b) => (isActive(b.status) || b.status === "requested") && b.end_at.getTime() >= at.getTime())
    .reverse();
  const done = bookings.filter((b) => !comingUp.includes(b));
  const showDone = tab === "done";
  const list = showDone ? done : comingUp;
  const record = trackRecord(facts);
  const paused = isEnabled("F13") ? pausedUntil(facts, at) : null;
  const rated = isEnabled("F17") ? await ratedBookingIds(done.map((b) => b.id), "volunteer") : new Set<string>();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <h1 className="text-4xl leading-10">My plans</h1>

        <section className="mt-5 rounded-xl bg-card p-4" aria-label="Your track record">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {user.name}
            {isEnabled("F8") && <LevelMark level={trustLevel(user.id_status, facts, at)} />}
          </p>
          <div className="mt-2">
            {record.empty ? (
              <p className="text-ink-soft italic">Your first activity starts your track record.</p>
            ) : (
              <>
                <TrackRecord record={record} />
                <p className="mt-1 text-sm text-ink-soft italic">NGOs see this when you join their activities.</p>
              </>
            )}
          </div>
          {paused && <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">Some activities are closed to you until {fmtDayDate(paused)}.</p>}
          {isEnabled("F16") && (
            <Link href="/me/profile" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3 w-full")}>My profile</Link>
          )}
        </section>

        <MeExtras userId={user.id} now={at} />

        <nav className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" aria-label="Your activities">
          {[
            { key: "", label: `Coming up${comingUp.length ? ` · ${comingUp.length}` : ""}` },
            { key: "done", label: `Done${done.length ? ` · ${done.length}` : ""}` },
          ].map((t) => (
            <Link
              key={t.key}
              href={t.key ? "/me?tab=done" : "/me"}
              aria-current={(t.key === "done") === showDone ? "page" : undefined}
              className={cn("flex min-h-11 items-center justify-center rounded-full text-sm font-semibold", (t.key === "done") === showDone && "bg-card text-primary shadow-card")}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {list.length === 0 ? (
          <section className="mt-6 rounded-xl bg-card p-6 text-center">
            <EmptyArt />
            <h2 className="mt-3 text-2xl">{showDone ? "Nothing here yet." : "Nothing planned yet."}</h2>
            <p className="mt-1 text-ink-soft italic">
              {showDone ? "Activities you've been to will show up here." : "When an NGO shares an activity with you, it'll show up here."}
            </p>
            {isEnabled("F9") && !showDone && <Link href="/feed" className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Explore activities</Link>}
          </section>
        ) : (
          <ul className="mt-4 space-y-3">
            {list.map((b) => (
              <li key={b.id}>
                <BookingCard
                  b={b}
                  now={at}
                  highlight={b.id === booked}
                  footer={
                    isEnabled("F17") && b.status === "attended" && !rated.has(b.id) ? (
                      <Link href={`/me/rate/${b.id}`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3 w-full")}>How was {b.org_name}?</Link>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}

        <form action={signOutAction} className="mt-8 text-center">
          <Button type="submit" variant="ghost" size="tap">Sign out</Button>
        </form>
      </main>
    </>
  );
}
