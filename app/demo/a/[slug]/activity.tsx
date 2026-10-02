"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Share2 } from "lucide-react";
import { Confetti } from "@/components/confetti";
import { useDemo } from "@/components/demo/store";
import { Pill } from "@/components/kit";
import { Sheet } from "@/components/sheet";
import { TaskCard } from "@/components/task-card";
import { toast } from "@/components/toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { toDetails, type DemoActivity } from "@/lib/demo";
import { cn } from "@/lib/utils";

/** The activity page in demo (brief B4, C1): a working "Save my spot" that ends in the success screen. */
export function DemoActivityView({ a, whenLine, checkIn, freeBy, weekday }: { a: DemoActivity; whenLine: string; checkIn: string | null; freeBy: string | null; weekday: string }) {
  const [demo, update] = useDemo();
  const [open, setOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const saved = demo.saved.includes(a.slug);
  const needsCheck = a.checkedOnly && demo.checked < 3;
  const full = a.left - (saved ? 1 : 0) <= 0 && !saved;

  return (
    <>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-2 pb-44 lg:max-w-2xl">
        <TaskCard data={toDetails(a, saved)} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-4 py-2">
          <Link href={`/demo/ngo/${a.org.slug}`} className="flex min-h-11 items-center font-semibold text-primary underline underline-offset-2">About {a.org.name}</Link>
          <button type="button" onClick={() => toast(`We've sent your question to ${a.org.name}.`)} className="flex min-h-11 items-center font-medium text-primary underline underline-offset-2">
            Ask {a.org.name.split(" ").slice(0, 2).join(" ")}
          </button>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto max-w-lg lg:max-w-2xl">
          {saved ? (
            <p className="flex items-center justify-center gap-2 py-3 font-semibold"><Pill tone="blue">Saved</Pill>See you on {weekday}.</p>
          ) : needsCheck ? (
            <div className="space-y-2 text-center">
              <p className="font-medium">This one is for volunteers whose ID we&apos;ve checked.</p>
              <Link href="/demo/me/get-checked" className={cn(buttonVariants({ size: "tap" }), "h-14 w-full text-lg")}>Get your ID checked</Link>
            </div>
          ) : full ? (
            <div>
              <p className="mb-2 text-center font-heading text-lg font-semibold">All spots are taken.</p>
              <Button type="button" size="tap" variant="outline" className="h-14 w-full text-lg" onClick={() => toast("We'll message you if someone frees theirs.")}>Tell me if a spot opens</Button>
            </div>
          ) : (
            <>
              <Button type="button" size="tap" className="h-14 w-full text-lg" onClick={() => setOpen(true)}>Save my spot</Button>
              <p className="mt-2 text-center text-sm text-ink-soft italic">
                {freeBy ? `Plans change? Free up your spot by ${freeBy}, no questions asked.` : "Plans change? Tell them in one tap."}
              </p>
            </>
          )}
        </div>
      </div>

      <Sheet open={open} onClose={() => { setOpen(false); setJustSaved(false); }} title={justSaved ? "You're in!" : "Save your spot?"}>
        {justSaved ? (
          <div className="relative">
            <Confetti />
            <p className="text-lg">{a.org.name} is expecting you on {weekday.slice(0, 3)}.</p>
            <div className="mt-5 grid gap-3">
              <Button type="button" size="tap" className="w-full" onClick={() => toast("Added. See you there.")}><CalendarPlus aria-hidden />Add to calendar</Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`I'm going to ${a.title} with ${a.org.name}. Come along?`)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "w-full")}>
                <Share2 aria-hidden />Share with a friend
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-accent-soft p-4">
              <p className="font-heading text-lg leading-6 font-semibold">{a.title}</p>
              <p className="mt-1 text-sm">{whenLine}</p>
              <p className="text-sm text-ink-soft">{a.place}</p>
            </div>
            <ul className="space-y-2">
              {checkIn && <li>We&apos;ll check in with you on <strong>{checkIn}</strong>.</li>}
              <li>
                {freeBy ? <>If something comes up, tell them by <strong>{freeBy}</strong>. It helps them find someone else.</> : <>It&apos;s close to the day, so they&apos;re counting on you.</>}
              </li>
            </ul>
            <Button type="button" size="tap" className="h-14 w-full text-lg" onClick={() => { update({ saved: [...demo.saved, a.slug] }); setJustSaved(true); }}>Yes, save my spot</Button>
            <button type="button" onClick={() => setOpen(false)} className="mx-auto flex min-h-11 items-center font-medium text-ink-soft underline underline-offset-2">Not now</button>
          </div>
        )}
      </Sheet>
    </>
  );
}
