"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CalendarPlus, Share2 } from "lucide-react";
import { Confetti } from "@/components/confetti";
import { FormError } from "@/components/forms/field";
import { Sheet } from "@/components/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveSpotAction, waitlistAction, type SaveState } from "./book/actions";

export interface SaveSpotProps {
  slug: string;
  occurrenceId: string;
  source: string;
  signedIn: boolean;
  /** Open the sheet straight away (coming back from sign-in). */
  autoOpen: boolean;
  approval: boolean;
  title: string;
  orgName: string;
  whenLine: string;
  placeLine: string;
  /** "Thu, 10 Oct", or null when the activity is too soon for a check-in. */
  checkInDay: string | null;
  /** "Fri, 9 am", or null when that time has already passed. */
  freeBy: string | null;
  weekday: string;
  ics: string;
  shareUrl: string;
}

/** Sticky "Save my spot" button and the sheet it opens (brief B4). */
export function SaveSpot(p: SaveSpotProps) {
  const [open, setOpen] = useState(p.autoOpen && p.signedIn);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSpotAction, {});
  const signIn = `/verify?next=${encodeURIComponent(`/t/${p.slug}?o=${p.occurrenceId}&save=1`)}`;

  return (
    <>
      {p.signedIn ? (
        <Button type="button" size="tap" className="h-14 w-full text-lg" onClick={() => setOpen(true)}>
          {p.approval ? "Ask to join" : "Save my spot"}
        </Button>
      ) : (
        <Link href={signIn} className={cn(buttonVariants({ size: "tap" }), "h-14 w-full text-lg")}>
          {p.approval ? "Ask to join" : "Save my spot"}
        </Link>
      )}
      <p className="mt-2 text-center text-sm text-ink-soft italic">
        {p.freeBy ? `Plans change? Free up your spot by ${p.freeBy}, no questions asked.` : "Plans change? Tell them in one tap."}
      </p>

      <Sheet open={open} onClose={() => (state.ok ? window.location.reload() : setOpen(false))} title={state.ok ? (state.asked ? "Asked!" : "You're in!") : "Save your spot?"}>
        {state.ok ? (
          <div className="relative">
            <Confetti />
            <p className="text-lg">
              {state.asked ? `${p.orgName} will reply within two days.` : `${p.orgName} is expecting you on ${p.weekday}.`}
            </p>
            <div className="mt-5 grid gap-3">
              <a href={p.ics} download="show-up.ics" className={cn(buttonVariants({ size: "tap" }), "w-full")}>
                <CalendarPlus aria-hidden />
                Add to calendar
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm going to ${p.title} with ${p.orgName}. Come along? ${p.shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "tap", variant: "outline" }), "w-full")}
              >
                <Share2 aria-hidden />
                Share with a friend
              </a>
              <Link href="/me" className="mx-auto flex min-h-11 items-center font-medium text-primary underline underline-offset-2">See my plans</Link>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="slug" value={p.slug} />
            <input type="hidden" name="occurrence_id" value={p.occurrenceId} />
            <input type="hidden" name="source" value={p.source} />
            <div className="rounded-xl bg-accent-soft p-4">
              <p className="font-heading text-lg leading-6 font-semibold">{p.title}</p>
              <p className="mt-1 text-sm">{p.whenLine}</p>
              <p className="text-sm text-ink-soft">{p.placeLine}</p>
            </div>
            <ul className="space-y-2">
              {p.checkInDay && <li>We&apos;ll check in with you on <strong>{p.checkInDay}</strong>.</li>}
              <li>
                {p.freeBy ? (
                  <>If something comes up, tell them by <strong>{p.freeBy}</strong>. It helps them find someone else.</>
                ) : (
                  <>It&apos;s close to the day, so they&apos;re counting on you. If something comes up, tell them straight away.</>
                )}
              </li>
            </ul>
            <FormError message={state.error} />
            <Button type="submit" size="tap" className="h-14 w-full text-lg" disabled={pending}>
              {pending ? "Saving…" : p.approval ? "Yes, ask to join" : "Yes, save my spot"}
            </Button>
            <button type="button" onClick={() => setOpen(false)} className="mx-auto flex min-h-11 items-center font-medium text-ink-soft underline underline-offset-2">
              Not now
            </button>
          </form>
        )}
      </Sheet>
    </>
  );
}

/** When every spot is taken (brief B12). */
export function TellMe({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(waitlistAction, {});
  if (state.done) {
    return <p role="status" className="text-center font-medium text-ok">We&apos;ll message you if someone frees theirs.</p>;
  }
  return (
    <div>
      <p className="mb-2 text-center font-heading text-lg font-semibold">All spots are taken.</p>
      {signedIn ? (
        <form action={action}>
          <input type="hidden" name="slug" value={slug} />
          <Button type="submit" size="tap" variant="outline" className="h-14 w-full text-lg" disabled={pending}>Tell me if a spot opens</Button>
        </form>
      ) : (
        <Link href={`/verify?next=${encodeURIComponent(`/t/${slug}`)}`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-14 w-full text-lg")}>
          Tell me if a spot opens
        </Link>
      )}
    </div>
  );
}
