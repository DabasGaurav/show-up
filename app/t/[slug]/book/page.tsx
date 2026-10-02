import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin, Video } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { activeBookingFor } from "@/lib/data/bookings";
import { getOccurrence, getTaskBySlug } from "@/lib/data/tasks";
import { fmtCommitment, fmtDate, fmtDateTime, fmtDuration, fmtTimeRange } from "@/lib/format";
import { freeReleaseDeadline } from "@/lib/rules";
import { S } from "@/lib/strings";
import { BookForm } from "./book-form";

export const metadata: Metadata = { title: "Confirm booking", robots: { index: false } };

// Screen 4: booking sheet — task summary, the commitment, and the release rule.
export default async function BookPage(props: PageProps<"/t/[slug]/book">) {
  const { slug } = await props.params;
  const { o, src } = await props.searchParams;
  const occId = typeof o === "string" ? o : "";
  const user = await requireUser(`/t/${slug}/book?o=${occId}`);
  const [task, occ, at] = await Promise.all([getTaskBySlug(slug), getOccurrence(occId), now()]);
  if (!task || !occ || occ.task_id !== task.id || task.status !== "published" || task.org_status !== "approved") notFound();
  if (await activeBookingFor(user.id, occ.id)) redirect("/me");

  const approval = task.booking_mode === "approval";
  const deadline = freeReleaseDeadline(occ.start_at);
  const insideFreeWindow = deadline.getTime() > at.getTime();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <Link href={`/t/${slug}?o=${occ.id}`} className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
          ← Back to task
        </Link>
        <h1 className="text-2xl font-bold">{approval ? "Request to join" : "Confirm booking"}</h1>

        <section className="mt-4 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">{task.cause}</p>
          <h2 className="text-lg font-semibold">{task.title}</h2>
          <p className="text-sm text-muted-foreground">{task.org_name}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2"><CalendarDays className="size-4.5 shrink-0 text-brand" aria-hidden />{fmtDate(occ.start_at)}</li>
            <li className="flex gap-2"><Clock className="size-4.5 shrink-0 text-brand" aria-hidden />{fmtTimeRange(occ.start_at, occ.end_at)} · {fmtDuration(task.duration_min)}</li>
            <li className="flex gap-2">
              {task.mode === "online" ? <Video className="size-4.5 shrink-0 text-brand" aria-hidden /> : <MapPin className="size-4.5 shrink-0 text-brand" aria-hidden />}
              {task.mode === "online" ? "Online · link shown after booking" : [task.address, task.city].filter(Boolean).join(", ")}
            </li>
          </ul>
        </section>

        <section className="mt-4 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Your commitment</h2>
          <p className="mt-1">
            You&apos;re committing to <strong>{task.role}</strong> for {fmtDuration(task.duration_min)}
            {task.commitment === "recurring" ? `, this session of “${fmtCommitment(task.commitment, task.recurrence_rule, task.occurrences, task.start_at)}”` : ""}.
            Done means: {task.done_definition}
          </p>
          <p className="mt-3">
            We&apos;ll check in 48 hours before. You tap <strong>“I&apos;m coming”</strong> or <strong>“Can&apos;t make it”</strong>.
          </p>
          {approval && <p className="mt-3">{task.org_name} replies within 48 hours, or your request is released automatically.</p>}
        </section>

        <section className="mt-4 rounded-xl border border-brand/20 bg-info-soft p-4 text-sm">
          <h2 className="font-semibold text-brand">If plans change</h2>
          <p className="mt-1">{S.rules.release}</p>
          <p className="mt-2 font-medium">
            {insideFreeWindow
              ? `Free release until ${fmtDateTime(deadline)}.`
              : "This session starts within 24 hours, so any release will count as late."}
          </p>
          <p className="mt-2 text-muted-foreground">{S.rules.consequence}</p>
        </section>

        <div className="mt-5">
          <BookForm
            slug={slug}
            occurrenceId={occ.id}
            source={src === "feed" ? "feed" : "link"}
            label={approval ? "Send request" : "Confirm booking"}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">Booking as {user.name}</p>
        </div>
      </main>
    </>
  );
}
