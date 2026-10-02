import { Star } from "lucide-react";
import { Chip, LevelBadge } from "@/components/badges";
import { TrackedDetails } from "@/components/tracked-details";
import type { VolunteerProfile } from "@/lib/data/volunteers";
import { isEnabled } from "@/lib/flags";
import { fmtDate, fmtDuration, shortName } from "@/lib/format";

/** Applicant profile card (§6.1 Screen 8). The phone number is passed only when it may be shown. */
export function ApplicantCard({
  p,
  status,
  phone,
  children,
  context,
}: {
  p: VolunteerProfile;
  status?: React.ReactNode;
  phone?: string | null;
  children?: React.ReactNode;
  context: Record<string, string>;
}) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {shortName(p.name)}
            {isEnabled("F8") && <LevelBadge level={p.level} />}
          </h3>
          <p className="mt-1 text-sm">{p.recordString}</p>
        </div>
        {status}
      </div>
      {p.pausedUntil && (
        <p className="mt-2 text-xs font-medium text-gap">
          Paused from Verified-only and Trusted-only tasks until {fmtDate(p.pausedUntil)} (2 no-shows in 90 days).
        </p>
      )}
      <TrackedDetails summary="Profile details" event="lab_profile_opened" props={{ applicant_id: p.id, ...context }} className="mt-1">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pb-1 text-sm">
          {isEnabled("F17") && (
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Ratings from other NGOs</dt>
              <dd>
                {p.ratingCount === 0 ? (
                  "No ratings yet"
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Star className="size-4 fill-warn text-warn" aria-hidden />
                      {p.ratingAverage?.toFixed(1)} <span className="font-normal text-muted-foreground">({p.ratingCount})</span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {p.ratingTags.map((t) => (
                        <Chip key={t.tag} tone="blue">{t.tag} ×{t.count}</Chip>
                      ))}
                    </span>
                  </>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Verified hours</dt>
            <dd className="font-medium">{p.hours > 0 ? fmtDuration(Math.round(p.hours * 60)) : "None yet"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Member since</dt>
            <dd className="font-medium">{fmtDate(p.memberSince)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Commitments kept in a row</dt>
            <dd className="font-medium">{p.streak}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="font-medium">{phone ?? "Shown once accepted"}</dd>
          </div>
        </dl>
      </TrackedDetails>
      {children}
    </article>
  );
}
