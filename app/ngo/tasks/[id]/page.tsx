import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { SharePanel } from "@/components/share-panel";
import { TaskCard } from "@/components/task-card";
import { buttonVariants } from "@/components/ui/button";
import { now } from "@/lib/clock";
import { listOccurrences } from "@/lib/data/tasks";
import { isEnabled } from "@/lib/flags";
import { fmtDayDate, fmtTimeRange } from "@/lib/format";
import { requireOrgTask } from "@/lib/ngo";
import { siteUrl } from "@/lib/site";
import { shareCaption, shareText, taskCardData } from "@/lib/task-view";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your link" };

// After posting a need: the link to share, and who's coming on each date.
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <Link href="/ngo" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← My NGO</Link>
        <h1 className="mb-5 text-4xl leading-10 text-balance">{published ? "Your link is ready." : task.title}</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <section className="rounded-xl bg-card p-5">
              <h2 className="text-xl">Share it where your volunteers are</h2>
              <p className="mt-1 mb-4 text-ink-soft">One link has every detail. People pick a spot in a tap.</p>
              <SharePanel url={url} text={shareText(task)} caption={shareCaption(task, url)} />
            </section>

            <section>
              <h2 className="text-2xl">Who&apos;s coming</h2>
              <ul className="mt-3 space-y-2">
                {occurrences.map((o) => (
                  <li key={o.id}>
                    <Link href={`/ngo/tasks/${task.id}/turnout/${o.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 hover:ring-2 hover:ring-primary/20">
                      <span className="font-medium">{fmtDayDate(o.start_at)} · {fmtTimeRange(o.start_at, o.end_at)}</span>
                      <span className="text-sm font-semibold text-primary">{o.seats_taken} of {task.slots_needed}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {isEnabled("F8") && (
                <Link href={`/ngo/tasks/${task.id}/applicants`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-3")}>People who joined</Link>
              )}
            </section>
          </div>
          <aside>
            <p className="mb-2 font-semibold">This is what volunteers will see.</p>
            {next && <TaskCard data={taskCardData(task, next, true)} heading="h2" />}
          </aside>
        </div>
      </main>
    </>
  );
}
