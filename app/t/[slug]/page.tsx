import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TaskCard } from "@/components/task-card";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { activeBookingFor, eligibility } from "@/lib/data/bookings";
import { getTaskBySlug, listOccurrences } from "@/lib/data/tasks";
import { track } from "@/lib/events";
import { fmtDate, fmtDateShort, fmtTimeRange } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { S } from "@/lib/strings";
import { taskCardData } from "@/lib/task-view";
import { cn } from "@/lib/utils";
import { TaskExtras } from "./extras";

async function load(slug: string) {
  const task = await getTaskBySlug(slug);
  // Only published tasks from approved organisations are public.
  if (!task || task.status === "draft" || task.org_status !== "approved") return null;
  return task;
}

// Open Graph tags so WhatsApp shows a rich preview: title, date, NGO name (§6.2).
export async function generateMetadata(props: PageProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const task = await load(slug);
  if (!task) return { title: "Task not found" };
  const description = `${fmtDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)} · ${task.org_name}`;
  return {
    title: task.title,
    description,
    openGraph: { title: task.title, description, type: "website", siteName: S.brand, url: `${await siteUrl()}/t/${slug}` },
    twitter: { card: "summary_large_image", title: task.title, description },
  };
}

// Public task page: the shareable task card (F2).
export default async function PublicTaskPage(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const { o, src } = await props.searchParams;
  const task = await load(slug);
  if (!task) notFound();

  const [occurrences, at, user] = await Promise.all([listOccurrences(task.id), now(), getUser()]);
  const upcoming = occurrences.filter((x) => x.start_at.getTime() > at.getTime());
  const occ = occurrences.find((x) => x.id === o) ?? upcoming[0] ?? occurrences[occurrences.length - 1];
  if (!occ) notFound();
  await track("task_viewed", { task_id: task.id, occurrence_id: occ.id, source: src === "feed" ? "feed" : "link" }, user?.id ?? null);

  const started = occ.start_at.getTime() <= at.getTime();
  const seatsLeft = task.slots_needed - occ.seats_taken;
  const elig = user ? await eligibility(user, occ.id, at) : null;
  const block = elig && !elig.ok ? elig : null;
  const mine = user ? await activeBookingFor(user.id, occ.id) : null;
  const here = `/t/${slug}?o=${occ.id}`;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28">
        {occurrences.length > 1 && (
          <nav aria-label="Sessions" className="mb-4">
            <p className="mb-2 text-sm font-medium">Choose a session</p>
            <ul className="flex gap-2 overflow-x-auto pb-1">
              {occurrences.map((x) => {
                const gone = x.start_at.getTime() <= at.getTime();
                return (
                  <li key={x.id}>
                    <Link
                      href={`/t/${slug}?o=${x.id}`}
                      aria-current={x.id === occ.id ? "true" : undefined}
                      className={cn(
                        "flex min-h-11 flex-col justify-center rounded-lg border bg-card px-3 py-1 text-sm whitespace-nowrap",
                        x.id === occ.id && "border-brand bg-info-soft font-semibold text-brand",
                        gone && "text-muted-foreground",
                      )}
                    >
                      {fmtDateShort(x.start_at)}
                      <span className="text-xs font-normal">
                        {gone ? "Done" : `${Math.max(0, task.slots_needed - x.seats_taken)} left`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <TaskCard data={taskCardData(task, occ, mine !== null && mine.status !== "requested")} />
        <TaskExtras task={task} userId={user?.id ?? null} />
        <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">{S.rules.release}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {mine ? (
            <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "w-full")}>
              {mine.status === "requested" ? "Request sent · view in My bookings" : "You're booked · view in My bookings"}
            </Link>
          ) : started ? (
            <p className="text-center text-sm font-medium text-muted-foreground">This session has already started.</p>
          ) : seatsLeft <= 0 ? (
            <p className="text-center text-sm font-medium text-gap">
              This session is full. Check back: released seats reopen here straight away.
            </p>
          ) : block?.reason === "paused" ? (
            <p className="text-center text-sm font-medium text-gap">
              Verified-only and Trusted-only tasks are paused for you until {block.pausedUntil ? fmtDateShort(block.pausedUntil) : "later"}, after two no-shows in 90 days.
            </p>
          ) : block?.reason === "trust_level" ? (
            <div className="space-y-2">
              <p className="flex items-center justify-center gap-1.5 text-center text-sm font-medium">
                <Lock className="size-4" aria-hidden />
                {block.minTrust === "trusted"
                  ? "Open to Trusted volunteers: Verified, plus 3 slots attended with no no-shows."
                  : "Open to Verified volunteers."}
              </p>
              {block.level === "new" && (
                <Link href={`/verify/id?next=${encodeURIComponent(here)}`} className={cn(buttonVariants({ size: "tap" }), "w-full")}>
                  Get Verified
                </Link>
              )}
            </div>
          ) : (
            <Link href={`/t/${slug}/book?o=${occ.id}${src === "feed" ? "&src=feed" : ""}`} className={cn(buttonVariants({ size: "tap" }), "w-full")}>
              {task.booking_mode === "approval" ? "Request to join" : "Book this slot"}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
