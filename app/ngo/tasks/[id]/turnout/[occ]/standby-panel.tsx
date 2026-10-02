import { Chip, LevelBadge } from "@/components/badges";
import { now } from "@/lib/clock";
import { listOffersForOccurrence } from "@/lib/data/standby";
import { volunteerProfiles } from "@/lib/data/volunteers";
import { fmtDateTime, shortName } from "@/lib/format";
import type { ChipTone } from "@/lib/rules";

const STATUS: Record<string, { label: string; tone: ChipTone }> = {
  sent: { label: "Offer sent", tone: "amber" },
  accepted: { label: "Accepted", tone: "green" },
  declined: { label: "Not this time", tone: "grey" },
  expired: { label: "No reply", tone: "grey" },
  taken: { label: "Taken by someone else", tone: "grey" },
};

/** "Standby cover" panel: offers sent and accepted for each released seat (§6.1 Screen 9). */
export async function StandbyCoverPanel({ occurrenceId }: { occurrenceId: string }) {
  const offers = await listOffersForOccurrence(occurrenceId);
  const profiles = await volunteerProfiles(offers.map((o) => o.user_id), await now());
  const seats = new Map<string, typeof offers>();
  for (const o of offers) seats.set(o.booking_released_id, [...(seats.get(o.booking_released_id) ?? []), o]);

  return (
    <section className="mt-6 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Standby cover</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        When a seat is released, it is offered to standby volunteers, Trusted first. The first to accept gets it.
      </p>
      {seats.size === 0 && <p className="mt-3 text-sm">No released seats have needed cover yet.</p>}
      <ol className="mt-3 space-y-3">
        {[...seats.entries()].map(([seat, list]) => {
          const filled = list.some((o) => o.status === "accepted");
          return (
            <li key={seat} className="rounded-lg border p-3">
              <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span>
                  Seat released by {shortName(list[0].released_by)}
                  {list[0].released_at ? ` · ${fmtDateTime(list[0].released_at)}` : ""}
                </span>
                <Chip tone={filled ? "green" : "amber"}>{filled ? "Filled by standby" : "Finding cover"}</Chip>
              </p>
              <ul className="mt-2 space-y-1.5">
                {list.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      {shortName(o.user_name)}
                      <LevelBadge level={profiles.get(o.user_id)?.level ?? "new"} />
                    </span>
                    <Chip tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Chip>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
