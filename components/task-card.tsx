import {
  Briefcase, CalendarDays, CheckCircle2, Clock, Hourglass, MapPin, Phone, Repeat, Users, Video, ShieldQuestion,
} from "lucide-react";
import { VerifiedNgoBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

// The standard task card (F2): the same block, always in the same order (PRD §6.1
// Screen 3). Pure presentation so the task template can render it as a live preview.

export interface TaskCardData {
  title: string;
  cause: string;
  orgName: string;
  orgVerified?: boolean;
  date: string;
  time: string;
  mode: "onsite" | "online";
  /** Address for on-site tasks. */
  place: string;
  mapUrl?: string;
  /** Only passed once the viewer has booked. */
  onlineLink?: string | null;
  role: string;
  duration: string;
  commitment: string;
  done: string;
  /** Role name before booking; name and phone after. */
  contact: string;
  seatsLeft: number;
  slotsNeeded: number;
  whoCanBook: string;
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="mt-0.5 text-brand [&>svg]:size-4.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

const dash = (s: string) => (s.trim() ? s : <span className="font-normal text-muted-foreground">—</span>);

export function TaskCard({ data, className }: { data: TaskCardData; className?: string }) {
  const full = data.seatsLeft <= 0;
  return (
    <article className={cn("rounded-xl border bg-card", className)}>
      <header className="border-b p-4">
        <p className="text-xs font-semibold tracking-wide text-brand uppercase">{data.cause || "Cause"}</p>
        <h1 className="mt-1 text-xl leading-snug font-bold text-balance">{data.title || "Task title"}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{data.orgName}</span>
          {data.orgVerified && <VerifiedNgoBadge />}
        </p>
      </header>
      <dl className="divide-y px-4">
        <Row icon={<CalendarDays aria-hidden />} label="Date">{dash(data.date)}</Row>
        <Row icon={<Clock aria-hidden />} label="Start and end time">{dash(data.time)}</Row>
        {data.mode === "onsite" ? (
          <Row icon={<MapPin aria-hidden />} label="Place">
            {dash(data.place)}
            {data.mapUrl && (
              <a
                href={data.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex min-h-6 items-center text-brand underline underline-offset-2"
              >
                Open map
              </a>
            )}
          </Row>
        ) : (
          <Row icon={<Video aria-hidden />} label="Online link">
            {data.onlineLink ? (
              <a href={data.onlineLink} target="_blank" rel="noreferrer" className="text-brand underline underline-offset-2">
                {data.onlineLink}
              </a>
            ) : (
              <span>Online · link shown after booking</span>
            )}
          </Row>
        )}
        <Row icon={<Briefcase aria-hidden />} label="Role">{dash(data.role)}</Row>
        <Row icon={<Hourglass aria-hidden />} label="Duration">{dash(data.duration)}</Row>
        <Row icon={<Repeat aria-hidden />} label="Commitment">{dash(data.commitment)}</Row>
        <Row icon={<CheckCircle2 aria-hidden />} label="What “done” means">{dash(data.done)}</Row>
        <Row icon={<Phone aria-hidden />} label="Contact">{dash(data.contact)}</Row>
        <Row icon={<Users aria-hidden />} label="Seats left">
          <span className={full ? "text-gap" : undefined}>
            {full ? "Full" : `${data.seatsLeft} of ${data.slotsNeeded}`}
          </span>
        </Row>
        <Row icon={<ShieldQuestion aria-hidden />} label="Who can book">{data.whoCanBook}</Row>
      </dl>
    </article>
  );
}
