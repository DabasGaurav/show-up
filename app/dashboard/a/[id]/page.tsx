import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { OnePeep } from "@/components/art";
import { Avatar, Pill, TrackDots, WhoBar } from "@/components/kit";
import { SharePanel } from "@/components/share-panel";
import { Header } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { REASON_PHRASE } from "@/lib/constants";
import { factsFor, listSpotsForDate } from "@/lib/data/bookings";
import { listDates } from "@/lib/data/tasks";
import { fmtDayDate, fmtPhone, fmtTimeRange, fmtWeekday, shortName, waLink } from "@/lib/format";
import { ngoPill } from "@/lib/labels";
import { requireOwnActivity } from "@/lib/ngo";
import { ACTIVE, canMark, trackRecord, whoIsComing } from "@/lib/rules";
import { siteUrl } from "@/lib/site";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { MarkForm } from "./mark-form";

export const metadata: Metadata = { title: "Who's coming" };

// Who's coming, the share link, and Mark who came after the day.
export default async function WhosComing(props: PageProps<"/dashboard/a/[id]">) {
  const { id } = await props.params;
  const { d, new: isNew } = await props.searchParams;
  const { activity } = await requireOwnActivity(id);
  const at = await tick();
  const [dates, origin] = await Promise.all([listDates(activity.id), siteUrl()]);
  const date = dates.find((x) => x.id === d) ?? dates.find((x) => x.end_at.getTime() >= at.getTime()) ?? dates[dates.length - 1];
  if (!date) notFound();

  const spots = await listSpotsForDate(date.id);
  const facts = await factsFor([...new Set(spots.map((s) => s.user_id))]);
  const who = whoIsComing(activity.slots_needed, spots.map((s) => s.status));
  const started = at.getTime() >= date.start_at.getTime();
  const marking = canMark(date.start_at, at);
  const toMark = spots.filter((s) => ACTIVE.includes(s.status) || s.status === "attended" || s.status === "no_show");
  const cant = spots.filter((s) => s.status === "released_early" || s.status === "released_late");
  const came = spots.filter((s) => s.status === "attended").length;
  const marked = came + spots.filter((s) => s.status === "no_show").length;
  const order: Record<string, number> = { confirmed: 0, attended: 0, booked: 1, awaiting_confirmation: 1, no_show: 2 };
  const people = [...spots].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  const url = `${origin}/a/${activity.share_slug}`;
  const shareText = `We need ${activity.slots_needed} ${activity.slots_needed === 1 ? "person" : "people"} for ${activity.title} on ${fmtWeekday(activity.start_at)}, ${fmtDayDate(activity.start_at).split(", ")[1]}. Pick a spot here:`;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <Link href="/dashboard" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← Dashboard</Link>
        <h1 className="text-4xl leading-10 text-balance">{isNew ? "Your link is ready." : activity.title}</h1>
        <p className="mt-2 text-ink-soft">{isNew ? `${activity.title} · ` : ""}{fmtDayDate(date.start_at)} · {fmtTimeRange(date.start_at, date.end_at)}</p>

        {dates.length > 1 && (
          <nav aria-label="Dates" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {dates.map((x) => (
              <Link key={x.id} href={`/dashboard/a/${activity.id}?d=${x.id}`} aria-current={x.id === date.id ? "true" : undefined} className={cn("flex min-h-11 shrink-0 items-center rounded-full border bg-card px-4 text-sm whitespace-nowrap", x.id === date.id && "border-primary bg-primary-soft font-semibold text-primary")}>
                {fmtDayDate(x.start_at)}
              </Link>
            ))}
          </nav>
        )}

        {!started && (
          <section className="mt-5 rounded-xl bg-card p-5" aria-label="Share">
            <h2 className="text-xl">Share it where your volunteers are</h2>
            <div className="mt-3"><SharePanel url={url} text={shareText} /></div>
          </section>
        )}

        <section className="mt-5 rounded-xl bg-card p-5" aria-label="Who's coming">
          <h2 className="mb-3 text-xl">Who&apos;s coming</h2>
          {started
            ? <p className="font-heading text-2xl font-semibold">{marked > 0 ? <><span className="text-ok">{came} of {marked}</span> came</> : "Who came?"}</p>
            : <WhoBar who={who} />}
        </section>

        {!started && cant.slice(-3).map((s) => (
          <p key={s.id} className="mt-3 rounded-xl bg-accent-soft px-4 py-3 font-medium">
            {s.user_name.split(" ")[0]} can&apos;t make it{s.release_reason ? ` (${REASON_PHRASE[s.release_reason]})` : ""}. Spot reopened.
          </p>
        ))}

        {marking && toMark.length > 0 && (
          <section className="mt-5 rounded-xl bg-card p-5">
            <h2 className="text-2xl">Mark who came</h2>
            <p className="mt-1 mb-4 text-ink-soft">Tap ✓ or ✕ for each person. It takes 30 seconds.</p>
            <MarkForm activityId={activity.id} dateId={date.id} rows={toMark.map((s) => ({ spotId: s.id, name: shortName(s.user_name), mark: s.status === "attended" || s.status === "no_show" ? s.status : null }))} />
          </section>
        )}

        <section className="mt-7">
          <h2 className="text-2xl">People</h2>
          {people.length === 0 ? (
            <div className="mt-3 rounded-xl bg-card p-6 text-center">
              <OnePeep index={1} />
              <p className="mt-3 font-heading text-xl font-semibold">Nobody yet. Share your link.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {people.map((s) => {
                const pill = ngoPill(s.status);
                // Phone numbers are shown only once someone is confirmed.
                const phone = (s.status === "confirmed" || s.status === "attended") && s.user_phone ? s.user_phone : null;
                return (
                  <li key={s.id} className="flex items-start gap-3 rounded-xl bg-card p-4">
                    <Avatar name={s.user_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{shortName(s.user_name)}</p>
                        <Pill tone={pill.tone}>{pill.label}{s.release_reason ? ` · ${REASON_PHRASE[s.release_reason]}` : ""}</Pill>
                      </div>
                      <TrackDots record={trackRecord(facts.get(s.user_id) ?? [])} className="mt-1" />
                      {phone && (
                        <p className="mt-2 flex flex-wrap gap-2">
                          <a href={`tel:${phone}`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-11")}><Phone aria-hidden />{fmtPhone(phone)}</a>
                          <a href={waLink(phone, "")} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-11")}><MessageCircle aria-hidden />WhatsApp</a>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
