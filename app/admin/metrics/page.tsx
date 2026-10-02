import { Chip } from "@/components/badges";
import { buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { computeMetrics } from "@/lib/data/metrics";
import { fmtDateTime } from "@/lib/format";
import type { ChipTone } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

function Tile({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: ChipTone }) {
  const color = tone === "green" ? "text-ok" : tone === "red" ? "text-gap" : tone === "amber" ? "text-warn" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 text-2xl font-bold tabular-nums", color)}>{value}</dd>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

// MVP1 metrics dashboard (§10.4): tiles, a table per event, CSV export.
export default async function MetricsPage() {
  if (!(await isAdmin())) return null;
  const m = await computeMetrics(await tick());
  const rate = m.overall.showUpOrEarlyReleaseRate;
  const tone: ChipTone = rate === null ? "grey" : rate >= m.target ? "green" : rate >= m.baseline ? "amber" : "red";

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Metrics</h1>
          {/* A file download from a route handler, not a page navigation. */}
          <a href="/admin/export/events-table" download className={cn(buttonVariants({ size: "tap", variant: "outline" }))}>Export CSV</a>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Riskiest assumption: volunteers who book through Show-Up turn up or release their slot in advance.
        </p>

        <div className="mt-4 rounded-xl border bg-card p-5">
          <p className="text-sm font-medium text-muted-foreground">Show-up-or-early-release rate</p>
          <p className="mt-1 flex flex-wrap items-end gap-3">
            <span className={cn("text-5xl leading-none font-bold tabular-nums", tone === "green" && "text-ok", tone === "amber" && "text-warn", tone === "red" && "text-gap")}>{pct(rate)}</span>
            <Chip tone={tone}>
              {rate === null ? "No past events yet" : rate >= m.target ? "Target met" : rate >= m.baseline ? "Above baseline, below target" : "Below baseline"}
            </Chip>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            (attended + released at least 24 hours before) ÷ bookings for past events, excluding “not recorded”. Target ≥{m.target}%. Baseline about {m.baseline}%.
          </p>
          <p className="mt-2 text-sm">
            Sample so far: <strong>{m.events.length}</strong> {m.events.length === 1 ? "event" : "events"} · <strong>{m.ngoCount}</strong> {m.ngoCount === 1 ? "NGO" : "NGOs"} · <strong>{m.overall.total}</strong> bookings
            <span className="text-muted-foreground"> (aim: 3+ events, 2+ NGOs, about 40 bookings)</span>
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="No-show rate" value={pct(m.overall.noShowRate)} note={`${m.overall.noShows} no-shows`} tone={m.overall.noShows > 0 ? "red" : undefined} />
          <Tile label="Late-release rate" value={pct(m.overall.lateReleaseRate)} note={`${m.overall.releasedLate} late · ${m.overall.releasedEarly} early`} />
          <Tile label="Confirmation rate at T−24h" value={pct(m.confirmationRateAtT24)} note="confirmed ÷ active" />
          <Tile label="Median release lead time" value={m.medianReleaseLeadHours === null ? "—" : `${m.medianReleaseLeadHours}h`} note="release → slot start" />
          <Tile label="Seats refilled after a release" value={`${m.seatsRefilled} of ${m.seatsReleased}`} note="manual standby" />
          <Tile label="NGO time spent chasing" value={m.avgChasingMinutes === null ? "—" : `${m.avgChasingMinutes} min`} note="average per event, NGO-reported" />
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Per NGO</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="border-b bg-muted text-xs"><tr><th className="px-3 py-2">NGO</th><th className="px-3 py-2">Events</th><th className="px-3 py-2">Bookings</th><th className="px-3 py-2">Rate</th></tr></thead>
            <tbody className="divide-y">
              {m.perNgo.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">No past events yet.</td></tr>}
              {m.perNgo.map((n) => (
                <tr key={n.org_name}><td className="px-3 py-2 font-medium">{n.org_name}</td><td className="px-3 py-2">{n.events}</td><td className="px-3 py-2">{n.total}</td><td className="px-3 py-2 font-semibold">{pct(n.showUpOrEarlyReleaseRate)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Per event</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="border-b bg-muted text-xs">
              <tr>
                {["Event", "Needed", "Bookings", "Attended", "Early release", "Late release", "No-show", "Unmarked", "Refilled", "Chasing (min)", "Rate"].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {m.events.length === 0 && <tr><td colSpan={11} className="px-3 py-4 text-muted-foreground">No past events yet.</td></tr>}
              {m.events.map((e) => (
                <tr key={e.occurrence_id}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{e.title}</span>
                    <span className="block text-xs text-muted-foreground">{e.org_name} · {fmtDateTime(e.start_at)}</span>
                  </td>
                  <td className="px-3 py-2">{e.slots_needed}</td>
                  <td className="px-3 py-2">{e.total}</td>
                  <td className="px-3 py-2">{e.attended}</td>
                  <td className="px-3 py-2">{e.releasedEarly}</td>
                  <td className="px-3 py-2">{e.releasedLate}</td>
                  <td className="px-3 py-2">{e.noShows}</td>
                  <td className="px-3 py-2">{e.notRecorded}</td>
                  <td className="px-3 py-2">{e.refilled}</td>
                  <td className="px-3 py-2">{e.chasingMinutes ?? "—"}</td>
                  <td className="px-3 py-2 font-semibold">{pct(e.showUpOrEarlyReleaseRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
