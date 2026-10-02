import { Check, ShieldCheck, Star } from "lucide-react";
import { CauseIcon } from "@/components/cause-icon";
import { causeUi } from "@/lib/constants";
import type { TrackRecord as TR } from "@/lib/labels";
import type { ChipTone } from "@/lib/rules";
import { cn } from "@/lib/utils";

// Signature pieces of the Show-Up look (Redesign brief A4).

const PILL: Record<ChipTone, string> = {
  green: "bg-ok-soft text-ok",
  amber: "bg-warn-soft text-warn",
  grey: "bg-released-soft text-released",
  red: "bg-gap-soft text-gap",
  blue: "bg-primary-soft text-primary",
};

export function Pill({ tone, children, className }: { tone: ChipTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap", PILL[tone], className)}>
      {children}
    </span>
  );
}

export const TRUST_TICK_TEXT = "We've met this NGO and checked their registration.";

/** Small teal circle with a check, shown beside an NGO we have met. */
export function TrustTick({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Checked. ${TRUST_TICK_TEXT}`}
      title={TRUST_TICK_TEXT}
      className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white", className)}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden />
    </span>
  );
}

const AVATAR = ["#0f5257", "#b3432f", "#8a5200", "#2e7d4f", "#5b4a8a", "#7a4b2a"];

/** Initials in a coloured circle when there is no photo. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  const color = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
  return (
    <span
      aria-hidden
      className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white uppercase", className)}
      style={{ background: color }}
    >
      {initials}
    </span>
  );
}

export function CauseChip({ cause, className }: { cause: string; className?: string }) {
  const ui = causeUi(cause);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-ink", className)}
      style={{ background: ui.color }}
    >
      <CauseIcon cause={cause} className="size-4" />
      {ui.label}
    </span>
  );
}

/** Large marigold date block: day, date, month. */
export function DateBlock({ dow, day, mon, className }: { dow: string; day: string; mon: string; className?: string }) {
  return (
    <span className={cn("flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent px-2 py-2 text-ink", className)} aria-hidden>
      <span className="text-xs font-semibold tracking-wide uppercase">{dow}</span>
      <span className="font-heading text-3xl leading-8 font-bold">{day}</span>
      <span className="text-xs font-semibold tracking-wide uppercase">{mon}</span>
    </span>
  );
}

/** "3 spots left" as filled and empty dots. */
export function SpotsDots({ needed, taken, className }: { needed: number; taken: number; className?: string }) {
  const left = Math.max(0, needed - taken);
  const shown = needed <= 16 ? needed : 12;
  const filled = Math.round((Math.min(taken, needed) / needed) * shown);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex gap-1" aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={cn("size-2.5 rounded-full", i < filled ? "bg-primary" : "border border-primary/50 bg-transparent")} />
        ))}
      </span>
      <span className={cn("font-medium", left === 0 && "text-gap")}>
        {left === 0 ? "All spots taken" : `${left} of ${needed} ${needed === 1 ? "spot" : "spots"} left`}
      </span>
    </span>
  );
}

/** Track-record dots with "Came 7 of 7 times" beside them. */
export function TrackRecord({ record, className }: { record: TR; className?: string }) {
  if (record.empty) return <span className={cn("text-sm text-ink-soft", className)}>No history yet</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex gap-1" aria-hidden>
        {record.dots.map((d, i) => (
          <span
            key={i}
            className={cn(
              "size-2.5 rounded-full",
              d === "came" && "bg-primary",
              d === "freed" && "bg-released-fill",
              d === "missed" && "border-2 border-gap bg-transparent",
            )}
          />
        ))}
      </span>
      <span className="font-medium">{record.text}</span>
    </span>
  );
}

export interface WhoCounts {
  needed: number;
  /** Said yes. */
  coming: number;
  /** Saved a spot; we have not checked in with them yet. */
  saved?: number;
  /** Asked, and no answer yet. */
  waiting: number;
  freed: number;
}

/** "Who's coming" bar: coming, not heard back and freed against the number needed. */
export function WhoBar({ counts, className }: { counts: WhoCounts; className?: string }) {
  const { needed, coming, waiting } = counts;
  const saved = counts.saved ?? 0;
  const filled = coming + saved + waiting;
  const cells = Math.max(needed, filled);
  const shown = Math.min(cells, 30);
  const toGo = Math.max(0, needed - filled);
  return (
    <div className={className}>
      <div className="flex gap-1" role="img" aria-label={whoLine(counts)}>
        {Array.from({ length: shown }, (_, i) => {
          const n = Math.floor((i / shown) * cells);
          return (
            <span
              key={i}
              className={cn(
                "h-3 flex-1 rounded-full",
                n < coming ? "bg-ok" : n < coming + saved ? "bg-primary/45" : n < filled ? "bg-warn-fill" : "border border-dashed border-ink-soft/60",
              )}
            />
          );
        })}
      </div>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-ok">{coming} coming</span>
        {saved > 0 && <> · <span className="font-semibold text-primary">{saved} saved a spot</span></>}
        {waiting > 0 && <> · <span className="font-semibold text-warn">{waiting} not heard back</span></>}
        {counts.freed > 0 && <> · <span className="text-ink-soft">{counts.freed} freed their spot</span></>}
        {toGo > 0 && <> · <span className="font-semibold text-gap">{toGo} to go</span></>}
      </p>
    </div>
  );
}

export function whoLine(c: WhoCounts): string {
  const saved = c.saved ?? 0;
  const toGo = Math.max(0, c.needed - c.coming - saved - c.waiting);
  return [`${c.coming} coming`, saved ? `${saved} saved a spot` : "", c.waiting ? `${c.waiting} not heard back` : "", c.freed ? `${c.freed} freed their spot` : "", toGo ? `${toGo} to go` : ""]
    .filter(Boolean)
    .join(" · ");
}

/** Trust levels in the UI: New has no badge, Checked a teal shield, Regular a marigold star. */
export function LevelMark({ level }: { level: "new" | "verified" | "trusted" }) {
  if (level === "new") return null;
  return level === "trusted" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-semibold text-warn">
      <Star className="size-3.5 fill-accent text-accent" aria-hidden />
      Regular
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-primary">
      <ShieldCheck className="size-3.5" aria-hidden />
      Checked
    </span>
  );
}

/** Icon row used for the key details of an activity. */
export function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-primary [&>svg]:size-5" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </li>
  );
}
