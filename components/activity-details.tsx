import { CalendarDays, CircleCheckBig, Hand, Laptop, MapPin, Phone, Repeat, Users } from "lucide-react";
import { CauseImage } from "@/components/cause-image";
import { Avatar, CauseChip, DetailRow, SpotsDots, Tick } from "@/components/kit";
import { cn } from "@/lib/utils";

// The body of the activity page: title, NGO with ✓, and the details one line each.
// Pure presentation, so "Post an activity" can show it as a live preview.

export interface ActivityDetailsData {
  title: string;
  cause: string;
  orgName: string;
  orgChecked: boolean;
  orgHref?: string;
  /** "Sat, 12 Oct · 9:00 am – 12:00 pm" */
  when: string;
  /** "3 hours" */
  duration: string;
  online: boolean;
  place: string;
  mapUrl?: string;
  /** Only passed once the viewer is confirmed. */
  onlineLink?: string | null;
  role: string;
  done: string;
  repeats: string;
  /** Name only until confirmed; name and phone after. */
  contact: string;
  needed: number;
  taken: number;
}

const blank = (s: string, placeholder: string) => (s.trim() ? s : <span className="text-ink-soft italic">{placeholder}</span>);

export function ActivityDetails({ data, heading: Heading = "h1", className }: { data: ActivityDetailsData; heading?: "h1" | "h2"; className?: string }) {
  const org = (
    <span className="flex items-center gap-1.5 font-semibold">
      <span className="truncate">{data.orgName}</span>
      {data.orgChecked && <Tick />}
    </span>
  );
  return (
    <article className={cn("overflow-hidden rounded-xl bg-card", className)}>
      <CauseImage cause={data.cause} sizes="(min-width: 1024px) 672px, 100vw" priority className="h-44 sm:h-56" />
      <div className="p-5">
        <CauseChip cause={data.cause || "Cause"} />
        <Heading className="mt-3 text-3xl leading-9 text-balance">{blank(data.title, "Your activity title")}</Heading>
        <p className="mt-3 flex items-center gap-2.5">
          <Avatar name={data.orgName} className="size-9" />
          {data.orgHref ? <a href={data.orgHref} className="flex min-h-11 min-w-0 items-center underline-offset-2 hover:underline">{org}</a> : org}
        </p>
        <ul className="mt-4 space-y-3.5">
          <DetailRow icon={<CalendarDays />}>
            <span className="font-medium">{blank(data.when, "Date and time")}</span>
            {data.duration && <span className="text-ink-soft"> ({data.duration})</span>}
          </DetailRow>
          {data.online ? (
            <DetailRow icon={<Laptop />}>
              {data.onlineLink ? (
                <a href={data.onlineLink} target="_blank" rel="noreferrer" className="font-medium break-all text-primary underline underline-offset-2">{data.onlineLink}</a>
              ) : (
                "Online, link sent once confirmed"
              )}
            </DetailRow>
          ) : (
            <DetailRow icon={<MapPin />}>
              {blank(data.place, "Where it happens")}
              {data.mapUrl && (
                <a href={data.mapUrl} target="_blank" rel="noreferrer" className="flex min-h-11 w-fit items-center font-medium text-primary underline underline-offset-2">Open in Maps</a>
              )}
            </DetailRow>
          )}
          <DetailRow icon={<Hand />}><span className="text-ink-soft">What you&apos;ll do: </span>{blank(data.role, "…")}</DetailRow>
          <DetailRow icon={<CircleCheckBig />}><span className="text-ink-soft">You&apos;re done when: </span>{blank(data.done, "…")}</DetailRow>
          <DetailRow icon={<Repeat />}>{data.repeats}</DetailRow>
          <DetailRow icon={<Users />}><SpotsDots needed={Math.max(1, data.needed)} taken={data.taken} /></DetailRow>
          <DetailRow icon={<Phone />}><span className="text-ink-soft">Ask for </span>{blank(data.contact, "who to ask for on the day")}</DetailRow>
        </ul>
      </div>
    </article>
  );
}
