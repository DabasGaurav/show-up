import Link from "next/link";
import { Clock, MapPin, Video } from "lucide-react";
import { CauseImage } from "@/components/cause-image";
import { CauseChip, SpotsDots, Tick } from "@/components/kit";
import { fmtDayDate, fmtDuration, fmtTimeRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ActivityCardData {
  title: string;
  cause: string;
  orgName: string;
  orgChecked: boolean;
  start: Date;
  end: Date;
  durationMin: number;
  /** "Online", or a short place line. */
  place: string;
  online: boolean;
  /** Pass 0 to leave out the spots line (on someone's own plans). */
  needed: number;
  taken: number;
}

/** Activity card: the cause's picture, date, title, NGO with ✓, time, place, cause, spots left. */
export function ActivityCard({ a, href, right, footer, className }: { a: ActivityCardData; href?: string; right?: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  const body = (
    <div className="flex gap-3.5">
      <CauseImage cause={a.cause} vary={a.title} sizes="(min-width: 640px) 128px, 96px" className="min-h-28 w-24 shrink-0 self-stretch rounded-lg sm:w-32" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary">{fmtDayDate(a.start)}</p>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-6 text-balance">{a.title}</h3>
          {right}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="min-w-0 truncate">{a.orgName}</span>
          {a.orgChecked && <Tick className="size-4 [&>svg]:size-3" />}
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li className="flex min-w-0 items-center gap-1.5">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden />
            {fmtTimeRange(a.start, a.end)} · {fmtDuration(a.durationMin)}
          </li>
          <li className="flex min-w-0 items-center gap-1.5">
            {a.online ? <Video className="size-4 shrink-0 text-primary" aria-hidden /> : <MapPin className="size-4 shrink-0 text-primary" aria-hidden />}
            <span className="min-w-0 truncate">{a.place}</span>
          </li>
        </ul>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <CauseChip cause={a.cause} className="py-0.5" />
          {a.needed > 0 && <SpotsDots needed={a.needed} taken={a.taken} />}
        </div>
      </div>
    </div>
  );
  return (
    <article className={cn("min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card p-3 shadow-card transition-shadow duration-150 sm:p-4", href && "hover:ring-2 hover:ring-primary/20", className)}>
      {href ? <Link href={href} className="block">{body}</Link> : body}
      {footer}
    </article>
  );
}
