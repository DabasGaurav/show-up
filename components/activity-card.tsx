import Link from "next/link";
import { Clock, MapPin, Video } from "lucide-react";
import { CauseChip, DateBlock, SpotsDots, TrustTick } from "@/components/kit";
import { dateBlock, fmtDuration, fmtTimeRange } from "@/lib/format";
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
  /** Pass 0 to hide the spots line (e.g. on someone's own plans). */
  needed: number;
  taken: number;
}

/** The activity card (brief A4.1): date block, title, cause, NGO, time, place, spots. */
export function ActivityCard({
  a,
  href,
  right,
  footer,
  className,
}: {
  a: ActivityCardData;
  href?: string;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <div className="flex gap-3.5">
      <DateBlock {...dateBlock(a.start)} className="self-start" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-6 text-balance">{a.title}</h3>
          {right}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
          <span className="min-w-0 truncate">{a.orgName}</span>
          {a.orgChecked && <TrustTick className="size-4 [&>svg]:size-3" />}
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
    <article className={cn("min-w-0 overflow-hidden rounded-xl bg-card p-4 transition-shadow duration-150", href && "hover:ring-2 hover:ring-primary/20", className)}>
      {href ? <Link href={href} className="block">{body}</Link> : body}
      {footer}
    </article>
  );
}
