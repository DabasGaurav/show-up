import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleSlash } from "lucide-react";
import { Chip } from "@/components/badges";
import { Countdown } from "@/components/countdown";
import { SiteHeader } from "@/components/site-header";
import { getBookingByToken, isActive } from "@/lib/data/bookings";
import { track } from "@/lib/events";
import { fmtDate, fmtDateTime, fmtTimeRange } from "@/lib/format";
import { freeReleaseDeadline, statusChip } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { ReleasePanel } from "./release-panel";

export const metadata: Metadata = { title: "Confirm or release", robots: { index: false } };

// The 48-hour confirmation view (F4), reached from the link in each message.
export default async function ConfirmPage(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const at = await tick();
  const b = await getBookingByToken(token);
  if (!b) notFound();
  await track("confirmation_viewed", { booking_id: b.id, task_id: b.task_id, status: b.status }, b.user_id);

  const chip = statusChip(b.status, b.start_at, at);
  const deadline = freeReleaseDeadline(b.start_at);
  const beforeStart = at.getTime() < b.start_at.getTime();
  const open = (isActive(b.status) || b.status === "requested") && beforeStart;
  const free = at.getTime() < deadline.getTime();
  const released = b.status === "released_early" || b.status === "released_late";

  return (
    <>
      <SiteHeader>
        <Link href="/me" className="flex min-h-11 items-center rounded-lg px-2.5 text-sm font-medium hover:bg-muted">
          My bookings
        </Link>
      </SiteHeader>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">{b.cause}</p>
              <h1 className="text-xl font-bold">{b.title}</h1>
              <p className="text-sm text-muted-foreground">{b.org_name}</p>
            </div>
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
          <p className="mt-3 text-sm font-medium">
            {fmtDate(b.start_at)} · {fmtTimeRange(b.start_at, b.end_at)}
          </p>
          <p className="text-sm text-muted-foreground">
            {b.mode === "online" ? "Online" : [b.address, b.city].filter(Boolean).join(", ")}
          </p>
        </section>

        {open && (
          <section className="mt-5">
            <h2 className="text-lg font-semibold">
              {b.status === "confirmed"
                ? "You're confirmed. See you there."
                : b.status === "requested"
                  ? `Waiting for ${b.org_name} to reply`
                  : `Hi ${b.user_name.split(" ")[0]}, still on for this?`}
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground" aria-live="polite">
              {free ? (
                <>
                  Free release for another <strong className="text-foreground"><Countdown deadline={deadline.getTime()} serverNow={at.getTime()} /></strong>{" "}
                  (until {fmtDateTime(deadline)}).
                </>
              ) : (
                <>The free-release window closed at {fmtDateTime(deadline)}. A release now counts as late.</>
              )}
            </p>
            <ReleasePanel
              token={b.confirm_token}
              canConfirm={b.status === "booked" || b.status === "awaiting_confirmation"}
              releaseLabel={b.status === "requested" ? "Withdraw request" : "Can't make it"}
              late={!free && b.status !== "requested"}
            />
          </section>
        )}

        {released && (
          <section role="status" className="mt-5 rounded-xl bg-released-soft p-5">
            <CircleSlash className="size-7 text-released" aria-hidden />
            <h2 className="mt-2 text-lg font-semibold">Released.</h2>
            <p className="mt-1 text-sm">
              {b.status === "released_early"
                ? "Thanks for telling them early, the NGO can now fill your spot."
                : `${b.org_name} has been told. As this was inside 24 hours, it shows on your reliability record.`}
            </p>
            <Link href={`/t/${b.share_slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
              View the task
            </Link>
          </section>
        )}

        {!open && !released && (
          <section role="status" className="mt-5 rounded-xl border bg-card p-5">
            <CheckCircle2 className="size-7 text-brand" aria-hidden />
            <p className="mt-2 text-sm">
              {b.status === "attended"
                ? "Thanks for showing up. This slot is on your reliability record."
                : b.status === "no_show"
                  ? "The NGO marked this slot as a no-show."
                  : b.status === "declined" || b.status === "auto_released"
                    ? "This request is closed."
                    : "This session has started. The NGO will mark attendance afterwards."}
            </p>
          </section>
        )}
      </main>
    </>
  );
}
