import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { answerOfferAction } from "@/app/actions/volunteer";
import { AppHeader } from "@/components/app-header";
import { Countdown } from "@/components/countdown";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getOffer } from "@/lib/data/standby";
import { requireFeature } from "@/lib/flags";
import { fmtDate, fmtTimeRange } from "@/lib/format";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Standby offer", robots: { index: false } };

// Standby offer card, reached from the offer message (F11).
export default async function StandbyOfferPage(props: PageProps<"/standby/[id]">) {
  requireFeature("F11");
  const { id } = await props.params;
  const user = await requireUser(`/standby/${id}`);
  const at = await tick();
  const o = await getOffer(id);
  if (!o || o.user_id !== user.id) notFound();
  const live = o.status === "sent" && o.expires_at.getTime() > at.getTime();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm font-medium text-brand">Standby cover</p>
        <h1 className="mt-1 text-2xl font-bold">
          {live ? "A slot just opened" : o.status === "accepted" ? "You got the slot" : o.status === "declined" ? "No problem" : "This slot has been taken"}
        </h1>
        <section className="mt-4 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">{o.cause}</p>
          <h2 className="text-lg font-semibold">{o.title}</h2>
          <p className="text-sm text-muted-foreground">{o.org_name}</p>
          <p className="mt-2 text-sm font-medium">{fmtDate(o.start_at)} · {fmtTimeRange(o.start_at, o.end_at)}</p>
          <p className="text-sm text-muted-foreground">{o.mode === "online" ? "Online" : [o.address, o.city].filter(Boolean).join(", ")}</p>
          <Link href={`/t/${o.share_slug}?o=${o.occurrence_id}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
            See the full task card
          </Link>
        </section>
        {live ? (
          <>
            <p className="mt-4 text-sm font-medium" aria-live="polite">
              Accept within <Countdown deadline={o.expires_at.getTime()} serverNow={at.getTime()} />. First to accept gets it.
            </p>
            <form action={answerOfferAction} className="mt-3 space-y-3">
              <input type="hidden" name="offer_id" value={o.id} />
              <Button type="submit" name="answer" value="accept" className="h-14 w-full text-lg">Accept</Button>
              <Button type="submit" name="answer" value="decline" variant="outline" className="h-14 w-full text-lg">Not this time</Button>
            </form>
          </>
        ) : (
          <>
            <p role="status" className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">
              {o.status === "accepted"
                ? "It's in My bookings. Thanks for stepping in."
                : o.status === "declined"
                  ? "We'll offer you the next one that fits."
                  : "Someone accepted first, or the offer ran out. Thanks for being on standby."}
            </p>
            <Link href="/me" className={cn(buttonVariants({ size: "tap" }), "mt-4 w-full")}>My bookings</Link>
          </>
        )}
      </main>
    </>
  );
}
