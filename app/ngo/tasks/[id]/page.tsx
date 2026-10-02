import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Chip } from "@/components/badges";
import { SharePanel } from "@/components/share-panel";
import { TaskCard } from "@/components/task-card";
import { buttonVariants } from "@/components/ui/button";
import { now } from "@/lib/clock";
import { listOccurrences } from "@/lib/data/tasks";
import { isEnabled } from "@/lib/flags";
import { fmtDateShort, fmtTimeRange } from "@/lib/format";
import { requireOrgTask } from "@/lib/ngo";
import { siteUrl } from "@/lib/site";
import { shareCaption, shareText, taskCardData } from "@/lib/task-view";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Task" };

export default async function NgoTaskPage(props: PageProps<"/ngo/tasks/[id]">) {
  const { id } = await props.params;
  const { published } = await props.searchParams;
  const { task } = await requireOrgTask(id);
  const [occurrences, at, origin] = await Promise.all([listOccurrences(task.id), now(), siteUrl()]);
  const url = `${origin}/t/${task.share_slug}`;
  const next = occurrences.find((o) => o.end_at.getTime() >= at.getTime()) ?? occurrences[occurrences.length - 1];

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Link href="/ngo" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
          ← Dashboard
        </Link>
        {published && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            Published. Share the link below with your volunteers.
          </p>
        )}
        <h1 className="mb-4 text-2xl font-bold">{task.title}</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="font-semibold">Share this task</h2>
              <p className="mt-1 mb-3 text-sm text-muted-foreground">
                One link with every detail. Volunteers book in one step after confirming their phone.
              </p>
              <SharePanel url={url} text={shareText(task)} caption={shareCaption(task, url)} />
            </section>

            <section>
              <h2 className="font-semibold">{occurrences.length > 1 ? "Sessions" : "Turnout"}</h2>
              <ul className="mt-3 space-y-2">
                {occurrences.map((o) => {
                  const past = o.end_at.getTime() < at.getTime();
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/ngo/tasks/${task.id}/turnout/${o.id}`}
                        className="flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:border-brand/40"
                      >
                        <span className="text-sm font-medium">
                          {fmtDateShort(o.start_at)} · {fmtTimeRange(o.start_at, o.end_at)}
                        </span>
                        <Chip tone={o.seats_taken >= task.slots_needed ? "green" : past ? "grey" : "amber"}>
                          {o.seats_taken}/{task.slots_needed} booked
                        </Chip>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {next && (
                  <Link href={`/ngo/tasks/${task.id}/turnout/${next.id}`} className={cn(buttonVariants({ size: "tap" }))}>
                    Open turnout view
                  </Link>
                )}
                {isEnabled("F8") && (
                  <Link href={`/ngo/tasks/${task.id}/applicants`} className={cn(buttonVariants({ size: "tap", variant: "outline" }))}>
                    Applicant profiles
                  </Link>
                )}
              </div>
            </section>
          </div>
          <aside>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">What volunteers see</p>
            {next && <TaskCard data={taskCardData(task, next, true)} heading="h2" />}
          </aside>
        </div>
      </main>
    </>
  );
}
