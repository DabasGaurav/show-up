import { Clock3, Users } from "lucide-react";
import { VerifiedNgoBadge, Chip } from "@/components/badges";
import { ContactNgo } from "@/components/contact-ngo";
import { NgoPhoto } from "@/components/ngo-photo";
import { Stars } from "@/components/stars";
import { now } from "@/lib/clock";
import { orgProfile } from "@/lib/data/org-profile";
import type { TaskWithOrg } from "@/lib/data/tasks";
import { isEnabled } from "@/lib/flags";
import { fmtDateShort } from "@/lib/format";
import { S } from "@/lib/strings";

// Prototype-only blocks under the task card: the NGO profile panel (F10) and
// "Contact NGO". Renders nothing in MVP1 (basic NGO name and contact only).
export async function TaskExtras({ task }: { task: TaskWithOrg; userId: string | null }) {
  if (!isEnabled("F10")) return null;
  const p = await orgProfile(task.org_id, await now());
  if (!p) return null;
  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-xl border bg-card p-4" aria-labelledby="ngo-profile">
        <h2 id="ngo-profile" className="font-semibold">{p.name}</h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {p.verified ? (
            <>
              <VerifiedNgoBadge />
              {S.badges.verifiedNgoTooltip}
            </>
          ) : (
            <Chip tone="grey">Not verified yet</Chip>
          )}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {p.photos.slice(0, 3).map((t, i) => <NgoPhoto key={t} token={t} alt={`${p.name}, illustration ${i + 1}`} />)}
        </div>
        {p.about && <p className="mt-3 line-clamp-2 text-sm">{p.about}</p>}
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <dt className="sr-only">Past volunteers</dt>
            <dd>{p.pastVolunteers > 0 ? `${p.pastVolunteers} past volunteers` : "No past volunteers yet"}</dd>
          </div>
          <div className="flex gap-2">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <dt className="sr-only">Response rate</dt>
            <dd>{p.responseRate !== null ? `Replies to ${p.responseRate}% of requests within 48 hours` : "No response history yet"}</dd>
          </div>
        </dl>
        <div className="mt-3 border-t pt-3">
          {p.rating ? (
            <>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Stars score={p.rating.average} />
                {p.rating.average.toFixed(1)} <span className="font-normal text-muted-foreground">· {p.rating.count} reviews</span>
              </p>
              <ul className="mt-2 space-y-2">
                {p.latestReviews.map((r, i) => (
                  <li key={i} className="rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="flex items-center justify-between gap-2">
                      <Stars score={r.score} />
                      <span className="text-xs text-muted-foreground">{r.by} · {fmtDateShort(r.at)}</span>
                    </span>
                    {r.tags.length > 0 && <span className="mt-1 block">{r.tags.join(" · ")}</span>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </section>
      <ContactNgo taskId={task.id} orgName={task.org_name} />
    </div>
  );
}
