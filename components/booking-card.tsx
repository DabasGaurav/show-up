import Link from "next/link";
import { ActivityCard } from "@/components/activity-card";
import { Pill } from "@/components/kit";
import { buttonVariants } from "@/components/ui/button";
import { isActive, type BookingView } from "@/lib/data/bookings";
import { fmtDayTime, fmtPhone, mapLink } from "@/lib/format";
import { volunteerPill } from "@/lib/labels";
import { freeReleaseDeadline } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** One of the volunteer's own plans (brief B6): the activity card plus a status pill. */
export function BookingCard({ b, now, highlight, footer }: { b: BookingView; now: Date; highlight?: boolean; footer?: React.ReactNode }) {
  const pill = volunteerPill(b.status);
  const upcoming = now.getTime() < b.start_at.getTime();
  const live = isActive(b.status) && upcoming;
  const waiting = live && b.status === "awaiting_confirmation";
  const deadline = freeReleaseDeadline(b.start_at);
  return (
    <ActivityCard
      className={cn(highlight && "ring-2 ring-ok/40")}
      href={`/t/${b.share_slug}?o=${b.occurrence_id}`}
      right={<Pill tone={pill.tone}>{pill.label}</Pill>}
      a={{
        title: b.title, cause: b.cause, orgName: b.org_name, orgChecked: false, start: b.start_at, end: b.end_at,
        durationMin: b.duration_min, online: b.mode === "online",
        place: b.mode === "online" ? "Online" : [b.address, b.city].filter(Boolean).join(", "),
        needed: 0, taken: 0,
      }}
      footer={
        <>
          {live && (
            <div className="mt-3 space-y-1 border-t pt-3 text-sm">
              <p>
                <span className="text-ink-soft">Ask for </span>
                {b.contact_name}, {b.contact_role} ·{" "}
                <a href={`tel:${b.contact_phone}`} className="font-medium text-primary underline underline-offset-2">{fmtPhone(b.contact_phone)}</a>
              </p>
              {b.mode === "online" ? (
                <p className="break-all"><a href={b.online_link ?? "#"} className="font-medium text-primary underline underline-offset-2">{b.online_link}</a></p>
              ) : (
                <p><a href={mapLink(b.lat, b.lng, b.address)} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">Open in Maps</a></p>
              )}
            </div>
          )}
          {(live || (b.status === "requested" && upcoming)) && (
            <div className="mt-3">
              <Link href={`/c/${b.confirm_token}`} className={cn(buttonVariants({ size: "tap", variant: waiting ? "default" : "outline" }), "w-full")}>
                {waiting ? "Tell them you're coming" : "I can't make it"}
              </Link>
              {live && now.getTime() < deadline.getTime() && (
                <p className="mt-2 text-center text-sm text-ink-soft italic">Free up your spot by {fmtDayTime(deadline)}, no questions asked.</p>
              )}
            </div>
          )}
          {footer}
        </>
      }
    />
  );
}
