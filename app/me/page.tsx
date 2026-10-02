import type { Metadata } from "next";
import Link from "next/link";
import { yesAction } from "@/app/c/[token]/actions";
import { signOutAction } from "@/app/signin/actions";
import { ActivityCard } from "@/components/activity-card";
import { OnePeep } from "@/components/art";
import { Pill, TrackDots } from "@/components/kit";
import { Header } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listSpotsForUser, type Spot } from "@/lib/data/bookings";
import { fmtDayTime, fmtPhone, mapLink } from "@/lib/format";
import { volunteerPill } from "@/lib/labels";
import { ACTIVE, canSayYes, freeBy, trackRecord } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My plans" };

const cardOf = (s: Spot) => ({
  title: s.title, cause: s.cause, orgName: s.org_name, orgChecked: s.org_checked, start: s.start_at, end: s.end_at,
  durationMin: s.duration_min, online: s.mode === "online",
  place: s.mode === "online" ? "Online" : [s.address, s.city].filter(Boolean).join(", "), needed: 0, taken: 0,
});

function Upcoming({ s, now }: { s: Spot; now: Date }) {
  const pill = volunteerPill(s.status);
  const confirmed = s.status === "confirmed";
  const free = freeBy(s.start_at);
  return (
    <ActivityCard
      a={cardOf(s)}
      href={`/a/${s.share_slug}?d=${s.occurrence_id}`}
      right={<Pill tone={pill.tone}>{pill.label}</Pill>}
      footer={
        <div className="mt-3 space-y-2 border-t pt-3">
          {confirmed && (
            <p className="text-sm">
              <span className="text-ink-soft">Ask for </span>{s.contact_name} ·{" "}
              <a href={`tel:${s.contact_phone}`} className="font-medium text-primary underline underline-offset-2">{fmtPhone(s.contact_phone)}</a>
              {" · "}
              {s.mode === "online"
                ? <a href={s.online_link ?? "#"} className="font-medium break-all text-primary underline underline-offset-2">Open the link</a>
                : <a href={mapLink(s.lat, s.lng, s.address)} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">Open in Maps</a>}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {canSayYes(s.status, s.start_at, now) && (
              <form action={yesAction}>
                <input type="hidden" name="token" value={s.confirm_token} />
                <input type="hidden" name="back" value="me" />
                <Button type="submit" size="tap" className="w-full">Yes, I&apos;ll be there</Button>
              </form>
            )}
            <Link href={`/c/${s.confirm_token}?cant=1`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "w-full")}>I can&apos;t make it</Link>
          </div>
          {now.getTime() <= free.getTime() && <p className="text-sm text-ink-soft">Free up your spot by {fmtDayTime(free)}, no questions asked.</p>}
        </div>
      }
    />
  );
}

// My plans.
export default async function MyPlans() {
  const user = await requireUser("/me");
  const at = await tick();
  const spots = await listSpotsForUser(user.id);
  const upcoming = spots.filter((s) => s.start_at.getTime() > at.getTime() && (ACTIVE.includes(s.status) || s.status === "released_early" || s.status === "released_late"));
  const past = spots.filter((s) => s.start_at.getTime() <= at.getTime() && (s.status === "attended" || s.status === "no_show" || ACTIVE.includes(s.status))).reverse();
  const record = trackRecord(spots.map((s) => ({ status: s.status, startAt: s.start_at })));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <h1 className="text-4xl leading-10">My plans</h1>

        <section className="mt-5 rounded-xl bg-card p-4" aria-label="Your track record">
          <p className="font-semibold">{user.name}</p>
          <div className="mt-2">
            {record.empty ? (
              <p className="text-ink-soft">Your first activity starts your track record.</p>
            ) : (
              <>
                <TrackDots record={record} />
                <p className="mt-1 text-sm text-ink-soft">NGOs see this when you join their activities.</p>
              </>
            )}
          </div>
        </section>

        <h2 className="mt-7 text-2xl">Upcoming</h2>
        {upcoming.length === 0 ? (
          <section className="mt-3 rounded-xl bg-card p-6 text-center">
            <OnePeep index={5} />
            <p className="mt-3 font-heading text-xl font-semibold">Nothing planned yet.</p>
            <Link href="/" className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Find something to do</Link>
          </section>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((s) => (
              <li key={s.id}>
                {ACTIVE.includes(s.status) ? <Upcoming s={s} now={at} /> : <ActivityCard a={cardOf(s)} href={`/a/${s.share_slug}`} right={<Pill tone="grey">Freed</Pill>} />}
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-8 text-2xl">Past</h2>
            <ul className="mt-3 space-y-3">
              {past.map((s) => {
                const pill = volunteerPill(s.status === "attended" || s.status === "no_show" ? s.status : "not_recorded");
                return <li key={s.id}><ActivityCard a={cardOf(s)} right={<Pill tone={pill.tone}>{pill.label}</Pill>} /></li>;
              })}
            </ul>
          </>
        )}

        <form action={signOutAction} className="mt-8 text-center">
          <Button type="submit" variant="ghost" size="tap">Sign out</Button>
        </form>
      </main>
    </>
  );
}
