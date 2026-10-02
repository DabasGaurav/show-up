"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { useDemo } from "@/components/demo/store";
import { buttonVariants } from "@/components/ui/button";
import { toCard, type DemoActivity } from "@/lib/demo";
import { cn } from "@/lib/utils";

/** "Miss it?" card (brief C3) on Aditi's home screen. */
export function MissIt({ picks }: { picks: DemoActivity[] }) {
  const [demo, update] = useDemo();
  if (demo.nudgeGone) {
    return <p role="status" className="mt-5 rounded-xl bg-card p-4 text-ink-soft italic">We&apos;ll keep a few ideas for you in Explore.</p>;
  }
  return (
    <section className="relative mt-5 rounded-xl bg-accent-soft p-5" aria-label="Ideas for this weekend">
      <button type="button" aria-label="Dismiss" onClick={() => update({ nudgeGone: true })} className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full hover:bg-accent/30">
        <X className="size-5" aria-hidden />
      </button>
      <h2 className="pr-10 text-2xl leading-8">It&apos;s been a while, Aditi. Welcome to Hyderabad!</h2>
      <p className="mt-1 italic">3 things this weekend match Food and Teaching, near you or online.</p>
      <ul className="mt-4 space-y-3">
        {picks.map((a) => <li key={a.slug}><ActivityCard a={toCard(a)} href={`/demo/a/${a.slug}`} /></li>)}
      </ul>
      <Link href="/demo/explore" className={cn(buttonVariants({ size: "tap" }), "mt-4 w-full")}>See all</Link>
    </section>
  );
}
