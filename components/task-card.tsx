import { CalendarDays, CircleCheckBig, Hand, Laptop, MapPin, Phone, Repeat, ShieldCheck, Users } from "lucide-react";
import { CauseCover } from "@/components/art";
import { Avatar, CauseChip, DetailRow, SpotsDots, TrustTick } from "@/components/kit";
import { cn } from "@/lib/utils";

// The activity page body (brief B4): cover, title, NGO row and the key details, one
// line each. Pure presentation, so "Post a need" can show it as a live preview.

export interface TaskCardData {
  title: string;
  cause: string;
  orgName: string;
  orgVerified?: boolean;
  /** Activities this NGO has already hosted; shown only when above zero. */
  hosted?: number;
  date: string;
  time: string;
  mode: "onsite" | "online";
  place: string;
  mapUrl?: string;
  /** Only passed once the viewer's spot is confirmed. */
  onlineLink?: string | null;
  role: string;
  duration: string;
  commitment: string;
  done: string;
  contact: string;
  seatsLeft: number;
  slotsNeeded: number;
  /** Only set when not everyone can join (prototype trust levels). */
  whoCanBook: string;
}

const blank = (s: string, placeholder: string) =>
  s.trim() ? s : <span className="text-ink-soft italic">{placeholder}</span>;

export function TaskCard({
  data,
  className,
  heading: Heading = "h1",
}: {
  data: TaskCardData;
  className?: string;
  /** Use "h2" when the page already has its own h1 (the live preview). */
  heading?: "h1" | "h2";
}) {
  const when = [data.date, data.time].filter(Boolean).join(" · ");
  return (
    <article className={cn("overflow-hidden rounded-xl bg-card", className)}>
      <CauseCover cause={data.cause || "Teaching"} className="h-36" />
      <div className="p-5">
        <CauseChip cause={data.cause || "Cause"} />
        <Heading className="mt-3 text-3xl leading-9 text-balance">{blank(data.title, "Your activity title")}</Heading>
        <p className="mt-3 flex items-center gap-2.5">
          <Avatar name={data.orgName} className="size-9" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="truncate">{data.orgName}</span>
              {data.orgVerified && <TrustTick />}
            </span>
            {!!data.hosted && (
              <span className="block text-sm text-ink-soft">
                Hosted {data.hosted} {data.hosted === 1 ? "activity" : "activities"} on Show-Up
              </span>
            )}
          </span>
        </p>

        <ul className="mt-5 space-y-3.5">
          <DetailRow icon={<CalendarDays />}>
            <span className="font-medium">{blank(when, "Date and time")}</span>
            {data.duration && <span className="text-ink-soft"> ({data.duration})</span>}
          </DetailRow>
          {data.mode === "onsite" ? (
            <DetailRow icon={<MapPin />}>
              {blank(data.place, "Where it happens")}
              {data.mapUrl && (
                <a href={data.mapUrl} target="_blank" rel="noreferrer" className="flex min-h-11 w-fit items-center font-medium text-primary underline underline-offset-2">
                  Open in Maps
                </a>
              )}
            </DetailRow>
          ) : (
            <DetailRow icon={<Laptop />}>
              Online
              {data.onlineLink ? (
                <a href={data.onlineLink} target="_blank" rel="noreferrer" className="flex min-h-11 w-fit items-center font-medium break-all text-primary underline underline-offset-2">
                  {data.onlineLink}
                </a>
              ) : (
                <span className="block text-sm text-ink-soft italic">link shared once you&apos;re confirmed</span>
              )}
            </DetailRow>
          )}
          <DetailRow icon={<Hand />}>
            <span className="text-ink-soft">What you&apos;ll do: </span>
            {blank(data.role, "…")}
          </DetailRow>
          <DetailRow icon={<CircleCheckBig />}>
            <span className="text-ink-soft">You&apos;re done when: </span>
            {blank(data.done, "…")}
          </DetailRow>
          <DetailRow icon={<Repeat />}>{data.commitment}</DetailRow>
          <DetailRow icon={<Users />}>
            <SpotsDots needed={Math.max(1, data.slotsNeeded)} taken={Math.max(0, data.slotsNeeded - data.seatsLeft)} />
          </DetailRow>
          {data.whoCanBook && <DetailRow icon={<ShieldCheck />}>{data.whoCanBook}</DetailRow>}
          <DetailRow icon={<Phone />}>
            <span className="text-ink-soft">{blank(data.contact, "Who to ask for on the day")}</span>
          </DetailRow>
        </ul>
      </div>
    </article>
  );
}
