import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { LevelBadge, PhoneVerifiedBadge } from "@/components/badges";
import { BookingCard } from "@/components/booking-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { bookingFacts, isActive, listBookingsForUser } from "@/lib/data/bookings";
import { isEnabled } from "@/lib/flags";
import { fmtDate } from "@/lib/format";
import { pausedUntil, reliabilityRecord, reliabilityString, trustLevel } from "@/lib/rules";
import { S } from "@/lib/strings";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { signOutAction } from "../verify/actions";
import { MeExtras } from "./extras";

export const metadata: Metadata = { title: "My bookings" };

export default async function MyBookingsPage(props: PageProps<"/me">) {
  const user = await requireUser("/me");
  const { booked } = await props.searchParams;
  const at = await tick();
  const [bookings, facts] = await Promise.all([listBookingsForUser(user.id), bookingFacts(user.id)]);

  const upcoming = bookings
    .filter((b) => (isActive(b.status) || b.status === "requested") && b.end_at.getTime() >= at.getTime())
    .reverse();
  const past = bookings.filter((b) => !upcoming.includes(b));
  const justBooked = bookings.find((b) => b.id === booked);
  const paused = pausedUntil(facts, at);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {justBooked && (
          <p role="status" className="mb-4 flex gap-2 rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            {justBooked.status === "requested"
              ? `Request sent. ${justBooked.org_name} will reply within 48 hours.`
              : justBooked.status === "confirmed"
                ? "You're booked and confirmed. We'll remind you on the day."
                : "You're booked. We'll check in 48 hours before."}
          </p>
        )}

        <section className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold">{user.name}</h1>
            {isEnabled("F8") ? <LevelBadge level={trustLevel(user.id_status, facts, at)} /> : <PhoneVerifiedBadge />}
          </div>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Reliability record: </span>
            <span className="font-medium">{reliabilityString(reliabilityRecord(facts))}</span>
          </p>
          {isEnabled("F13") && paused && (
            <p role="status" className="mt-3 rounded-lg bg-gap-soft px-3 py-2 text-sm text-gap">
              <strong>Paused until {fmtDate(paused)}.</strong> {S.rules.consequence} You can still book tasks open to everyone.
            </p>
          )}
          {isEnabled("F8") && user.id_status !== "approved" && (
            <Link href="/verify/id?next=/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3 w-full")}>
              {user.id_status === "pending" ? "ID under review" : "Get Verified"}
            </Link>
          )}
          {isEnabled("F16") && (
            <Link href="/me/profile" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3 w-full")}>
              {S.nav.profile}
            </Link>
          )}
        </section>

        <MeExtras userId={user.id} now={at} />

        <section className="mt-6">
          <h2 className="text-lg font-semibold">My bookings</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              No upcoming bookings.{" "}
              {isEnabled("F9") ? (
                <Link href="/feed" className="text-brand underline underline-offset-2">Find a task</Link>
              ) : (
                "Open a task link from a partner NGO to book."
              )}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcoming.map((b) => (
                <li key={b.id}><BookingCard b={b} now={at} highlight={b.id === booked} /></li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Past</h2>
            <ul className="mt-3 space-y-3">
              {past.map((b) => (
                <li key={b.id}><BookingCard b={b} now={at} /></li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-8 rounded-lg bg-muted px-4 py-3 text-sm">{S.rules.release}</p>
        <form action={signOutAction} className="mt-4">
          <Button type="submit" variant="ghost" size="tap">{S.nav.signOut}</Button>
        </form>
      </main>
    </>
  );
}
