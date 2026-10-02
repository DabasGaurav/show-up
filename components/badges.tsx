import { Shield, ShieldCheck, ShieldPlus, BadgeCheck } from "lucide-react";
import type { ChipTone, TrustLevel } from "@/lib/rules";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";

// Consistent shield icons for New, Verified, Trusted and Verified NGO (PRD §12).
// Every status carries text as well as colour.

const TONE: Record<ChipTone, string> = {
  green: "bg-ok-soft text-ok",
  amber: "bg-warn-soft text-warn",
  grey: "bg-released-soft text-released",
  red: "bg-gap-soft text-gap",
  blue: "bg-info-soft text-brand",
};

export function Chip({
  tone,
  children,
  className,
  title,
}: {
  tone: ChipTone;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: TrustLevel }) {
  const Icon = level === "trusted" ? ShieldPlus : level === "verified" ? ShieldCheck : Shield;
  const tone: ChipTone = level === "trusted" ? "green" : level === "verified" ? "blue" : "grey";
  return (
    <Chip tone={tone}>
      <Icon className="size-3.5" aria-hidden />
      {S.badges[level]}
    </Chip>
  );
}

export function PhoneVerifiedBadge() {
  return (
    <Chip tone="grey">
      <Shield className="size-3.5" aria-hidden />
      {S.badges.phoneVerified}
    </Chip>
  );
}

export function VerifiedNgoBadge() {
  return (
    <Chip tone="blue" title={S.badges.verifiedNgoTooltip}>
      <BadgeCheck className="size-3.5" aria-hidden />
      {S.badges.verifiedNgo}
    </Chip>
  );
}
