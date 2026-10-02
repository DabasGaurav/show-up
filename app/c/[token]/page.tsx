import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { EmptyArt } from "@/components/art";
import { CauseChip, DateBlock, Pill } from "@/components/kit";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getBookingByToken, isActive } from "@/lib/data/bookings";
import { track } from "@/lib/events";
import { dateBlock, fmtDayTime, fmtTimeRange, fmtWeekday } from "@/lib/format";
import { volunteerPill } from "@/lib/labels";
import { freeReleaseDeadline } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { ReleasePanel } from "./release-panel";

export const metadata: Metadata = { title: "Still on?", robots: { index: false } };

// Check-in page (brief B5), opened from the reminder.
export default async function CheckInPage(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const at = await tick();
  const b = await getBookingByToken(token);
  if (!b) notFound();
  await track("confirmation_viewed", { booking_id: b.id, task_id: b.task_id, status: b.status }, b.user_id);

  const pill = volunteerPill(b.status);
  const deadline = freeReleaseDeadline(b.start_at);
  const beforeStart = at.getTime() < b.start_at.getTime();
  const open = (isActive(b.status) || b.status === "requested") && beforeStart;
  const free = at.getTime() < deadline.getTime();
  const freed = b.status === "released_early" || b.status === "released_late";
  const day = fmtWeekday(b.start_at);

  const heading = freed
    ? "Done. Your spot is open for someone else."
    : !open
      ? b.status === "attended" ? "Thank you for showing up." : "This one's already happened."
      : b.status === "confirmed" ? "Lovely. See you there."
      : b.status === "requested" ? `Waiting to hear from ${b.org_name}.`
      : `Still on for ${day}?`;

  return (
    <>
      <SiteHeader>
        <Link href="/me" className="flex min-h-11 items-center rounded-full px-3 font-semibold text-primary hover:bg-primary-soft">My plans</Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-4 lg:py-10">
        <h1 className="text-4xl leading-10 text-balance">{heading}</h1>
        {open && b.status === "confirmed" && <p className="mt-2 text-ink-soft italic">We&apos;ll send the details on the morning.</p>}
        {freed && <p className="mt-2 text-ink-soft">Thanks for letting {b.org_name} know.</p>}

        <section className="mt-5 flex gap-3.5 rounded-xl bg-card p-4">
          <DateBlock {...dateBlock(b.start_at)} className="self-start" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg leading-6">{b.title}</h2>
              <Pill tone={pill.tone}>{pill.label}</Pill>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{b.org_name}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm"><CalendarDays className="size-4 text-primary" aria-hidden />{fmtTimeRange(b.start_at, b.end_at)}</p>
            <p className="flex items-center gap-1.5 text-sm"><MapPin className="size-4 shrink-0 text-primary" aria-hidden /><span className="truncate">{b.mode === "online" ? "Online" : [b.address, b.city].filter(Boolean).join(", ")}</span></p>
            <CauseChip cause={b.cause} className="mt-2 py-0.5" />
          </div>
        </section>

        {open && (
          <section className="mt-5">
            <ReleasePanel
              token={b.confirm_token}
              canConfirm={b.status === "booked" || b.status === "awaiting_confirmation"}
              late={!free && b.status !== "requested"}
              isRequest={b.status === "requested"}
            />
            {b.status !== "requested" && free && (
              <p className="mt-3 text-center text-sm text-ink-soft italic">Plans change? Free up your spot by {fmtDayTime(deadline)}, no questions asked.</p>
            )}
          </section>
        )}

        {!open && (
          <section className="mt-6 text-center">
            <EmptyArt />
            {b.status === "no_show" && <p className="mt-2 text-ink-soft">{b.org_name} marked that you didn&apos;t come.</p>}
            <Link href={freed ? `/t/${b.share_slug}` : "/me"} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4")}>
              {freed ? "See the activity" : "See my plans"}
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
