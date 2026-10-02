import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoActivity, demoNow } from "@/lib/demo";
import { fmtDayDate, fmtDayTime, fmtDuration, fmtTimeRange, fmtWeekday } from "@/lib/format";
import { DemoActivityView } from "./activity";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function DemoActivityPage(props: PageProps<"/demo/a/[slug]">) {
  const { slug } = await props.params;
  const now = demoNow();
  const a = demoActivity(slug, now);
  if (!a) notFound();
  const checkIn = new Date(a.startAt.getTime() - 48 * 36e5);
  const freeBy = new Date(a.startAt.getTime() - 24 * 36e5);
  return (
    <DemoActivityView
      a={a}
      whenLine={`${fmtDayDate(a.startAt)} · ${fmtTimeRange(a.startAt, a.endAt)} (${fmtDuration(a.minutes)})`}
      checkIn={checkIn.getTime() > now.getTime() ? fmtDayDate(checkIn) : null}
      freeBy={freeBy.getTime() > now.getTime() ? fmtDayTime(freeBy) : null}
      weekday={fmtWeekday(a.startAt)}
    />
  );
}
