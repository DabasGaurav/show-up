"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CalendarPlus, Share2 } from "lucide-react";
import { Confetti } from "@/components/confetti";
import { Field, FormError, TextInput } from "@/components/forms/field";
import { Sheet } from "@/components/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveSpotAction, type SaveState } from "./actions";

export interface SaveSpotProps {
  slug: string;
  dateId: string;
  signedIn: boolean;
  /** First spot: ask for name and mobile on this sheet. */
  askDetails: boolean;
  name: string;
  /** Open the sheet straight away (coming back from sign-up or sign-in). */
  autoOpen: boolean;
  title: string;
  orgName: string;
  when: string;
  place: string;
  /** "Thu, 10 Oct", or null when the activity is less than 2 days away. */
  checkInDay: string | null;
  /** "Fri, 9 am", or null when that time has passed. */
  freeBy: string | null;
  weekday: string;
  ics: string;
  shareUrl: string;
}

/** The sticky "Save my spot" button and the sheet it opens. */
export function SaveSpot(p: SaveSpotProps) {
  const [open, setOpen] = useState(p.autoOpen && p.signedIn);
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSpotAction, {});
  const signIn = `/signin?next=${encodeURIComponent(`/a/${p.slug}?d=${p.dateId}&save=1`)}`;
  const big = "h-14 w-full text-lg";

  return (
    <>
      {p.signedIn ? (
        <Button type="button" size="tap" className={big} onClick={() => setOpen(true)}>Save my spot</Button>
      ) : (
        <Link href={signIn} className={cn(buttonVariants({ size: "tap" }), big)}>Save my spot</Link>
      )}
      <p className="mt-2 text-center text-sm text-ink-soft">
        {p.freeBy ? `Plans change? Free up your spot by ${p.freeBy}, no questions asked.` : "Plans change? Tell them in one tap."}
      </p>

      <Sheet open={open} onClose={() => (state.ok ? window.location.reload() : setOpen(false))} title={state.ok ? "You're in!" : "Save your spot?"}>
        {state.ok ? (
          <div className="relative">
            <Confetti />
            <p className="text-lg">{p.orgName} is expecting you on {p.weekday}.</p>
            <div className="mt-5 grid gap-3">
              <a href={p.ics} download="show-up.ics" className={cn(buttonVariants({ size: "tap" }), "w-full")}><CalendarPlus aria-hidden />Add to calendar</a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm going to ${p.title} with ${p.orgName}. Come along? ${p.shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "tap", variant: "outline" }), "w-full")}
              >
                <Share2 aria-hidden />Share with a friend
              </a>
              <Link href="/me" className="mx-auto flex min-h-11 items-center font-medium text-primary underline underline-offset-2">See my plans</Link>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="slug" value={p.slug} />
            <input type="hidden" name="date_id" value={p.dateId} />
            <div className="rounded-xl bg-accent-soft p-4">
              <p className="font-heading text-lg leading-6 font-semibold">{p.title}</p>
              <p className="mt-1 text-sm">{p.when}</p>
              <p className="text-sm text-ink-soft">{p.place}</p>
            </div>
            {p.checkInDay && <p>We&apos;ll check in with you on <strong>{p.checkInDay}</strong>.</p>}
            <p>
              {p.freeBy ? <>If something comes up, tell them by <strong>{p.freeBy}</strong>.</> : <>It&apos;s close to the day, so they&apos;re counting on you.</>}
            </p>
            {p.askDetails && (
              <div className="space-y-3">
                <Field label="Your name" htmlFor="spot-name"><TextInput id="spot-name" name="name" autoComplete="name" defaultValue={p.name} required /></Field>
                <Field label="Mobile number" htmlFor="spot-phone" hint="Shared with the NGO only once you confirm.">
                  <div className="flex gap-2">
                    <span className="flex h-12 items-center rounded-xl border border-input bg-muted px-3 font-medium">+91</span>
                    <TextInput id="spot-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required />
                  </div>
                </Field>
              </div>
            )}
            <FormError message={state.error} />
            <Button type="submit" size="tap" className={big} disabled={pending}>{pending ? "Saving…" : "Yes, save my spot"}</Button>
            <button type="button" onClick={() => setOpen(false)} className="mx-auto flex min-h-11 items-center font-medium text-ink-soft underline underline-offset-2">Not now</button>
          </form>
        )}
      </Sheet>
    </>
  );
}
