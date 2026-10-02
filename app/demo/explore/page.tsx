import type { Metadata } from "next";
import { demoActivities, demoNow } from "@/lib/demo";
import { istDateKey, weekendDays } from "@/lib/format";
import { Explore, PickOne } from "./explore";

export const metadata: Metadata = { title: "Explore" };
export const dynamic = "force-dynamic";

export default async function DemoExplore(props: PageProps<"/demo/explore">) {
  const { pick } = await props.searchParams;
  const now = demoNow();
  const activities = demoActivities(now);
  if (pick) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
        <h1 className="text-4xl leading-10">Three ways to help this Sunday.</h1>
        <p className="mt-2 text-ink-soft">Which one would you pick?</p>
        <PickOne activities={activities.filter((a) => a.similar)} />
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4">
      <h1 className="text-4xl leading-10">What would you like to do?</h1>
      <Explore activities={activities} weekend={weekendDays(now).map(istDateKey)} />
    </main>
  );
}
