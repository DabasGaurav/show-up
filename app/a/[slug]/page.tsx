import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityDetails } from "@/components/activity-details";
import { Pill } from "@/components/kit";
import { Header } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { detailsOf, placeLine } from "@/lib/activity-view";
import { getUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { mySpot } from "@/lib/data/bookings";
import { getActivityBySlug, listDates } from "@/lib/data/tasks";
import { fmtDayDate, fmtDayTime, fmtDuration, fmtTimeRange, fmtWeekday } from "@/lib/format";
import { icsDataUrl } from "@/lib/ics";
import { volunteerPill } from "@/lib/labels";
import { checkInAt, freeBy } from "@/lib/rules";
import { siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SaveSpot } from "./save-spot";

/** Only activities from NGOs we have approved are public. */
async function load(slug: string) {
  const a = await getActivityBySlug(slug);
  return a && a.org_status === "approved" ? a : null;
}

export async function generateMetadata(props: PageProps<"/a/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await load(slug);
  if (!a) return { title: "Not found" };
  const description = `${fmtDayDate(a.start_at)} · ${fmtTimeRange(a.start_at, a.end_at)} · ${a.org_name}`;
  return {
    title: a.title,
    description,
    openGraph: { title: a.title, description, type: "website", siteName: "Show-Up", url: `${await siteUrl()}/a/${slug}` },
    twitter: { card: "summary_large_image", title: a.title, description },
  };
}

// Activity page.
export default async function ActivityPage(props: PageProps<"/a/[slug]">) {
  const { slug } = await props.params;
  const { d, save } = await props.searchParams;
  const a = await load(slug);
  if (!a) notFound();

  const [dates, at, user, origin] = await Promise.all([listDates(a.id), now(), getUser(), siteUrl()]);
  const upcoming = dates.filter((x) => x.start_at.getTime() > at.getTime());
  const date = dates.find((x) => x.id === d) ?? upcoming[0] ?? dates[dates.length - 1];
  if (!date) notFound();

  const mine = user ? await mySpot(user.id, date.id) : null;
  const started = date.start_at.getTime() <= at.getTime();
  const full = date.taken >= a.slots_needed;
  const free = freeBy(date.start_at);
  const checkIn = checkInAt(date.start_at);
  const pill = mine ? volunteerPill(mine.status) : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-2 pb-44 lg:max-w-2xl">
        {dates.length > 1 && (
          <nav aria-label="Dates" className="mb-4">
            <p className="mb-2 font-semibold">Pick a date</p>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {dates.map((x) => {
                const gone = x.start_at.getTime() <= at.getTime();
                const left = Math.max(0, a.slots_needed - x.taken);
                return (
                  <li key={x.id}>
                    <Link
                      href={`/a/${slug}?d=${x.id}`}
                      aria-current={x.id === date.id ? "true" : undefined}
                      className={cn("flex min-h-12 flex-col justify-center rounded-full border bg-card px-4 py-1 text-sm whitespace-nowrap", x.id === date.id && "border-primary bg-primary-soft font-semibold text-primary", gone && "text-ink-soft")}
                    >
                      {fmtDayDate(x.start_at)}
                      <span className="font-normal">{gone ? "Done" : left === 0 ? "Full" : `${left} left`}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <ActivityDetails data={detailsOf(a, date, mine?.status === "confirmed" || mine?.status === "attended")} />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-4 backdrop-blur">
        <div className="mx-auto max-w-lg lg:max-w-2xl">
          {mine && pill ? (
            <div className="text-center">
              <p className="mb-2 flex items-center justify-center gap-2 font-semibold"><Pill tone={pill.tone}>{pill.label}</Pill>See you on {fmtWeekday(date.start_at)}.</p>
              <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-14 w-full text-lg")}>See my plans</Link>
            </div>
          ) : started ? (
            <p className="py-2 text-center">
              <span className="font-heading block text-lg font-semibold">This one&apos;s already happened.</span>
              <Link href={`/ngo/${a.org_slug}`} className="text-primary underline underline-offset-2">See what {a.org_name} has next</Link>
            </p>
          ) : full ? (
            <p className="py-2 text-center">
              <span className="font-heading block text-lg font-semibold">All spots are taken.</span>
              <span className="text-ink-soft">Look again later. Spots open up when plans change.</span>
            </p>
          ) : (
            <SaveSpot
              slug={slug}
              dateId={date.id}
              signedIn={user !== null}
              autoOpen={save === "1"}
              title={a.title}
              orgName={a.org_name}
              when={`${fmtDayDate(date.start_at)} · ${fmtTimeRange(date.start_at, date.end_at)} (${fmtDuration(a.duration_min)})`}
              place={placeLine(a)}
              checkInDay={checkIn.getTime() > at.getTime() ? fmtDayDate(checkIn) : null}
              freeBy={free.getTime() > at.getTime() ? fmtDayTime(free) : null}
              weekday={fmtWeekday(date.start_at)}
              ics={icsDataUrl({ title: a.title, start: date.start_at, end: date.end_at, location: placeLine(a), description: `What you'll do: ${a.role}`, url: `${origin}/a/${slug}` })}
              shareUrl={`${origin}/a/${slug}`}
            />
          )}
        </div>
      </div>
    </>
  );
}
