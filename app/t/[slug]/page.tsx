import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { EmptyArt } from "@/components/art";
import { Pill } from "@/components/kit";
import { TaskCard } from "@/components/task-card";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { activeBookingFor, eligibility } from "@/lib/data/bookings";
import { getTaskBySlug, listOccurrences } from "@/lib/data/tasks";
import { queryOne } from "@/lib/db";
import { track } from "@/lib/events";
import { fmtDayDate, fmtDayTime, fmtDuration, fmtTimeRange, fmtWeekday } from "@/lib/format";
import { icsDataUrl } from "@/lib/ics";
import { volunteerPill } from "@/lib/labels";
import { freeReleaseDeadline, HOUR_MS, RULES } from "@/lib/rules";
import { siteUrl } from "@/lib/site";
import { taskCardData } from "@/lib/task-view";
import { cn } from "@/lib/utils";
import { TaskExtras } from "./extras";
import { SaveSpot, TellMe } from "./save-spot";

async function load(slug: string) {
  const task = await getTaskBySlug(slug);
  // Only posted activities from NGOs we have approved are public.
  if (!task || task.status === "draft" || task.org_status !== "approved") return null;
  return task;
}

// Link preview for WhatsApp: title, date, NGO name.
export async function generateMetadata(props: PageProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const task = await load(slug);
  if (!task) return { title: "Not found" };
  const description = `${fmtDayDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)} · ${task.org_name}`;
  return {
    title: task.title,
    description,
    openGraph: { title: task.title, description, type: "website", siteName: "Show-Up", url: `${await siteUrl()}/t/${slug}` },
    twitter: { card: "summary_large_image", title: task.title, description },
  };
}

// Activity page (brief B4): the most important screen.
export default async function ActivityPage(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const { o, src, save } = await props.searchParams;
  const task = await load(slug);
  if (!task) notFound();

  const [occurrences, at, user, origin] = await Promise.all([listOccurrences(task.id), now(), getUser(), siteUrl()]);
  const upcoming = occurrences.filter((x) => x.start_at.getTime() > at.getTime());
  const occ = occurrences.find((x) => x.id === o) ?? upcoming[0] ?? occurrences[occurrences.length - 1];
  if (!occ) notFound();
  await track("task_viewed", { task_id: task.id, occurrence_id: occ.id, source: src === "feed" ? "feed" : "link" }, user?.id ?? null);

  const started = occ.start_at.getTime() <= at.getTime();
  const full = task.slots_needed - occ.seats_taken <= 0;
  const [elig, mine, hosted] = await Promise.all([
    user ? eligibility(user, occ.id, at) : null,
    user ? activeBookingFor(user.id, occ.id) : null,
    queryOne<{ n: number }>(
      "select count(*)::int as n from task_occurrences oc join tasks t on t.id = oc.task_id where t.org_id = $1 and oc.end_at < $2",
      [task.org_id, at],
    ),
  ]);
  const block = elig && !elig.ok ? elig : null;
  const confirmed = mine !== null && mine.status !== "requested";

  const freeBy = freeReleaseDeadline(occ.start_at);
  const checkIn = new Date(occ.start_at.getTime() - RULES.confirmRequestHours * HOUR_MS);
  const place = task.mode === "online" ? "Online" : [task.address, task.city].filter(Boolean).join(", ");
  const whenLine = `${fmtDayDate(occ.start_at)} · ${fmtTimeRange(occ.start_at, occ.end_at)} (${fmtDuration(task.duration_min)})`;
  const here = `/t/${slug}?o=${occ.id}`;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-2 pb-44 lg:max-w-2xl">
        {occurrences.length > 1 && (
          <nav aria-label="Dates" className="mb-4">
            <p className="mb-2 font-semibold">Pick a date</p>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {occurrences.map((x) => {
                const gone = x.start_at.getTime() <= at.getTime();
                const left = Math.max(0, task.slots_needed - x.seats_taken);
                return (
                  <li key={x.id}>
                    <Link
                      href={`/t/${slug}?o=${x.id}`}
                      aria-current={x.id === occ.id ? "true" : undefined}
                      className={cn(
                        "flex min-h-12 flex-col justify-center rounded-full border bg-card px-4 py-1 text-sm whitespace-nowrap",
                        x.id === occ.id && "border-primary bg-primary-soft font-semibold text-primary",
                        gone && "text-ink-soft",
                      )}
                    >
                      {fmtDayDate(x.start_at)}
                      <span className="text-sm font-normal">{gone ? "Done" : left === 0 ? "Full" : `${left} left`}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <TaskCard data={taskCardData(task, occ, confirmed, hosted?.n ?? 0)} />
        <TaskExtras task={task} userId={user?.id ?? null} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto max-w-lg lg:max-w-2xl">
          {mine ? (
            <div className="text-center">
              <p className="mb-2 flex items-center justify-center gap-2 font-semibold">
                <Pill tone={volunteerPill(mine.status).tone}>{volunteerPill(mine.status).label}</Pill>
                {mine.status === "requested" ? `${task.org_name} will reply soon.` : `See you on ${fmtWeekday(occ.start_at)}.`}
              </p>
              <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-14 w-full text-lg")}>See my plans</Link>
            </div>
          ) : started ? (
            <div className="flex items-center gap-3">
              <EmptyArt className="mx-0 h-16" />
              <p>
                <span className="font-heading block text-lg font-semibold">This one&apos;s already happened.</span>
                <span className="text-sm text-ink-soft italic">Ask {task.org_name} for their next one.</span>
              </p>
            </div>
          ) : full ? (
            <TellMe slug={slug} signedIn={user !== null} />
          ) : block?.reason === "paused" ? (
            <p className="text-center font-medium">
              You can join this one again from {block.pausedUntil ? fmtDayDate(block.pausedUntil) : "next month"}.
            </p>
          ) : block?.reason === "trust_level" ? (
            <div className="space-y-2 text-center">
              <p className="font-medium">
                {block.minTrust === "trusted" ? "This one is for Regulars: checked, and came 3 times." : "This one is for volunteers whose ID we've checked."}
              </p>
              {block.level === "new" && (
                <Link href={`/verify/id?next=${encodeURIComponent(here)}`} className={cn(buttonVariants({ size: "tap" }), "h-14 w-full text-lg")}>
                  Get your ID checked
                </Link>
              )}
            </div>
          ) : (
            <SaveSpot
              slug={slug}
              occurrenceId={occ.id}
              source={src === "feed" ? "feed" : "link"}
              signedIn={user !== null}
              autoOpen={save === "1"}
              approval={task.booking_mode === "approval"}
              title={task.title}
              orgName={task.org_name}
              whenLine={whenLine}
              placeLine={place}
              checkInDay={checkIn.getTime() > at.getTime() ? fmtDayDate(checkIn) : null}
              freeBy={freeBy.getTime() > at.getTime() ? fmtDayTime(freeBy) : null}
              weekday={fmtWeekday(occ.start_at).slice(0, 3)}
              ics={icsDataUrl({ title: task.title, start: occ.start_at, end: occ.end_at, location: place, description: `What you'll do: ${task.role}`, url: `${origin}${here}` })}
              shareUrl={`${origin}/t/${slug}`}
            />
          )}
        </div>
      </div>
    </>
  );
}
