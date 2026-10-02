import Link from "next/link";
import { Lock } from "lucide-react";
import { Chip, VerifiedNgoBadge } from "@/components/badges";
import { CauseIcon } from "@/components/cause-icon";
import type { FeedItem } from "@/lib/data/feed";
import { fmtDateShort, fmtDuration, fmtTime } from "@/lib/format";

const TRUST_TAG = { verified: "Verified only", trusted: "Trusted only" } as const;

/** Compact task card for the feed and nudges (§6.1 Screen 2). */
export function FeedCard({ t, locked, src = "feed" }: { t: FeedItem; locked: boolean; src?: string }) {
  const left = Math.max(0, t.slots_needed - t.seats_taken);
  return (
    <Link
      href={`/t/${t.share_slug}?o=${t.occurrence_id}&src=${src}`}
      className="flex gap-3 rounded-xl border bg-card p-3 hover:border-brand/40"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-soft text-brand">
        <CauseIcon cause={t.cause} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-snug font-semibold">{t.title}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {t.org_name}
          {t.org_verified_at && <VerifiedNgoBadge />}
        </span>
        <span className="mt-1 block text-sm">
          {fmtDateShort(t.start_at)} · {fmtTime(t.start_at)} · {fmtDuration(t.duration_min)}
        </span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <Chip tone="grey">{t.mode === "online" ? "Online" : t.distance_km !== null ? `${t.distance_km} km` : t.city}</Chip>
          <Chip tone={left === 0 ? "red" : left <= 2 ? "amber" : "green"}>
            {left === 0 ? "Full" : `${left} ${left === 1 ? "seat" : "seats"} left`}
          </Chip>
          <Chip tone="grey">{t.commitment === "recurring" ? "Recurring" : "One-off"}</Chip>
          {t.min_trust !== "everyone" && (
            <Chip tone={locked ? "amber" : "blue"}>
              {locked && <Lock className="size-3" aria-hidden />}
              {TRUST_TAG[t.min_trust]}
            </Chip>
          )}
          {t.booking_mode === "approval" && <Chip tone="grey">Needs approval</Chip>}
        </span>
      </span>
    </Link>
  );
}
