import { Check } from "lucide-react";
import { CauseIcon } from "@/components/cause-icon";
import { causeColor } from "@/lib/constants";
import type { Tone, TrackRecord as TR, WhoCounts } from "@/lib/rules";
import { cn } from "@/lib/utils";

// The pieces that make Show-Up look like Show-Up (spec §5).

const PILL: Record<Tone, string> = {
  green: "bg-ok-soft text-ok",
  amber: "bg-warn-soft text-warn",
  grey: "bg-released-soft text-released",
  red: "bg-gap-soft text-gap",
  teal: "bg-primary-soft text-primary",
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap", PILL[tone], className)}>
      {children}
    </span>
  );
}

/** The ✓ beside an NGO our team has approved. */
export function Tick({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Checked by Show-Up"
      title="Checked by Show-Up"
      className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white", className)}
    >
      <Check className="size-3.5" strokeWidth={3} aria-hidden />
    </span>
  );
}

const AVATAR = ["#0f5257", "#b3432f", "#8a5200", "#2e7d4f", "#5b4a8a", "#7a4b2a"];

/** Initials in a coloured circle. */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  const color = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
  return (
    <span aria-hidden className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white uppercase", className)} style={{ background: color }}>
      {initials}
    </span>
  );
}

export function CauseChip({ cause, className }: { cause: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-ink", className)} style={{ background: causeColor(cause) }}>
      <CauseIcon cause={cause} className="size-4" />
      {cause}
    </span>
  );
}

/** The marigold date block on every activity card. */
export function DateBlock({ dow, day, mon, className }: { dow: string; day: string; mon: string; className?: string }) {
  return (
    <span className={cn("flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent px-2 py-2 text-ink", className)} aria-hidden>
      <span className="text-sm font-semibold tracking-wide uppercase">{dow}</span>
      <span className="font-heading text-3xl leading-8 font-bold">{day}</span>
      <span className="text-sm font-semibold tracking-wide uppercase">{mon}</span>
    </span>
  );
}

/** Spots left, as small dots. */
export function SpotsDots({ needed, taken, className }: { needed: number; taken: number; className?: string }) {
  const left = Math.max(0, needed - taken);
  const shown = needed <= 16 ? needed : 12;
  const filled = Math.round((Math.min(taken, needed) / needed) * shown);
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex gap-1" aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={cn("size-2.5 rounded-full", i < filled ? "bg-primary" : "border border-primary/50")} />
        ))}
      </span>
      <span className={cn("font-medium", left === 0 && "text-gap")}>
        {left === 0 ? "All spots taken" : `${left} of ${needed} ${needed === 1 ? "spot" : "spots"} left`}
      </span>
    </span>
  );
}

/** Track record: dots, plus "Came 7 of 7 times". */
export function TrackDots({ record, className }: { record: TR; className?: string }) {
  if (record.empty) return <span className={cn("text-sm text-ink-soft", className)}>No history yet</span>;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
      <span className="inline-flex gap-1" aria-hidden>
        {record.dots.map((d, i) => (
          <span key={i} className={cn("size-2.5 rounded-full", d === "came" && "bg-primary", d === "freed" && "bg-released-fill", d === "missed" && "border-2 border-gap")} />
        ))}
      </span>
      <span className="font-medium">{record.text}</span>
    </span>
  );
}

/** "Who's coming" bar: coming / not heard back / can't make it / still needed. */
export function WhoBar({ who, className, lastLabel = "still needed" }: { who: WhoCounts; className?: string; lastLabel?: string }) {
  const cells = Math.max(who.needed, who.coming + who.notHeardBack);
  const shown = Math.min(cells, 30);
  const text = [
    `${who.coming} coming`,
    `${who.notHeardBack} not heard back`,
    `${who.cantMakeIt} can't make it`,
    `${who.stillNeeded} ${lastLabel}`,
  ].join(" · ");
  return (
    <div className={className}>
      <div className="flex gap-1" role="img" aria-label={text}>
        {Array.from({ length: shown }, (_, i) => {
          const n = Math.floor((i / shown) * cells);
          return (
            <span
              key={i}
              className={cn("h-3 flex-1 rounded-full", n < who.coming ? "bg-ok" : n < who.coming + who.notHeardBack ? "bg-warn-fill" : "border border-dashed border-ink-soft/60")}
            />
          );
        })}
      </div>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-ok">{who.coming} coming</span>
        {" · "}<span className={cn(who.notHeardBack > 0 ? "font-semibold text-warn" : "text-ink-soft")}>{who.notHeardBack} not heard back</span>
        {" · "}<span className="text-ink-soft">{who.cantMakeIt} can&apos;t make it</span>
        {" · "}<span className={cn(who.stillNeeded > 0 ? "font-semibold text-gap" : "text-ink-soft")}>{who.stillNeeded} {lastLabel}</span>
      </p>
    </div>
  );
}

/** One line of an activity's details: an icon and a sentence. */
export function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-primary [&>svg]:size-5" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </li>
  );
}
