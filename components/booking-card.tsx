import Link from "next/link";
import { Chip } from "@/components/badges";
import { buttonVariants } from "@/components/ui/button";
import { isActive, type BookingView } from "@/lib/data/bookings";
import { fmtDate, fmtDateTime, fmtPhone, fmtTimeRange, mapLink } from "@/lib/format";
import { freeReleaseDeadline, statusChip } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** A volunteer's booking under "My bookings" (§6.1 Screen 4). */
export function BookingCard({ b, now, highlight }: { b: BookingView; now: Date; highlight?: boolean }) {
  const chip = statusChip(b.status, b.start_at, now);
  const upcoming = now.getTime() < b.start_at.getTime();
  const live = isActive(b.status) && upcoming;
  const needsConfirm = live && b.status === "awaiting_confirmation";
  const deadline = freeReleaseDeadline(b.start_at);
  return (
    <article className={cn("rounded-xl border bg-card p-4", highlight && "border-ok ring-2 ring-ok/20")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">{b.cause}</p>
          <h3 className="font-semibold">
            <Link href={`/t/${b.share_slug}?o=${b.occurrence_id}`} className="hover:underline">{b.title}</Link>
          </h3>
          <p className="text-sm text-muted-foreground">{b.org_name}</p>
        </div>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <p className="mt-2 text-sm font-medium">{fmtDate(b.start_at)} · {fmtTimeRange(b.start_at, b.end_at)}</p>

      {live && (
        <dl className="mt-2 space-y-1 text-sm">
          <div>
            <dt className="inline text-muted-foreground">{b.mode === "online" ? "Link: " : "Place: "}</dt>
            <dd className="inline">
              {b.mode === "online" ? (
                <a href={b.online_link ?? "#"} className="break-all text-brand underline underline-offset-2">{b.online_link}</a>
              ) : (
                <>
                  {[b.address, b.city].filter(Boolean).join(", ")}{" "}
                  <a href={mapLink(b.lat, b.lng, b.address)} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">Map</a>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Contact: </dt>
            <dd className="inline">{b.contact_name} ({b.contact_role}) · <a href={`tel:${b.contact_phone}`} className="text-brand underline underline-offset-2">{fmtPhone(b.contact_phone)}</a></dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Done means: </dt>
            <dd className="inline">{b.done_definition}</dd>
          </div>
        </dl>
      )}

      {b.status === "requested" && upcoming && (
        <p className="mt-2 text-sm text-muted-foreground">{b.org_name} replies within 48 hours, or the request is released.</p>
      )}

      {(live || (b.status === "requested" && upcoming)) && (
        <div className="mt-3 flex flex-col gap-2">
          <Link
            href={`/c/${b.confirm_token}`}
            className={cn(buttonVariants({ size: "tap", variant: needsConfirm ? "default" : "outline" }), "w-full")}
          >
            {needsConfirm ? "Confirm: I'm coming / Can't make it" : b.status === "requested" ? "Withdraw request" : "Plans changed? Release slot"}
          </Link>
          {live && (
            <p className="text-xs text-muted-foreground">
              {now.getTime() < deadline.getTime()
                ? `Free release until ${fmtDateTime(deadline)}.`
                : "Inside 24 hours: a release now counts as late."}
            </p>
          )}
        </div>
      )}

      {b.release_reason && (
        <p className="mt-2 text-xs text-muted-foreground">Released{b.released_at ? ` ${fmtDateTime(b.released_at)}` : ""} · reason: {b.release_reason}</p>
      )}
    </article>
  );
}
