import type { Metadata } from "next";
import { Star } from "lucide-react";
import { Avatar, TrackRecord } from "@/components/kit";
import { DEMO, demoActivities, demoNow } from "@/lib/demo";
import { MissIt } from "./home";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

// Aditi's home screen: she hasn't joined anything in 45 days and has just moved city.
export default function DemoHome() {
  const all = demoActivities(demoNow());
  const picks = DEMO.nudge.map((slug) => all.find((a) => a.slug === slug)!).filter(Boolean);
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar name="Aditi Kapoor" className="size-12 text-base" />
        <div>
          <h1 className="text-3xl leading-9">Hello, Aditi.</h1>
          <p className="flex items-center gap-1 text-sm font-semibold text-warn"><Star className="size-4 fill-accent text-accent" aria-hidden />Regular</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-card p-4">
        <TrackRecord record={{ dots: Array(6).fill("came"), came: 6, total: 6, text: "Came 6 of 6 times", empty: false }} />
      </div>
      <MissIt picks={picks} />
    </main>
  );
}
