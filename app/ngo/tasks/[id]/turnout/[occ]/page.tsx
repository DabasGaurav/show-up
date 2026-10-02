import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Chip, LevelBadge } from "@/components/badges";
import { listBookingsForOccurrence } from "@/lib/data/bookings";
import { volunteerProfiles } from "@/lib/data/volunteers";
import { getOccurrence } from "@/lib/data/tasks";
import { queryOne } from "@/lib/db";
import { isEnabled, isMvp } from "@/lib/flags";
import { fmtDate, fmtDateTime, fmtPhone, fmtTimeRange, shortName } from "@/lib/format";
import { requireOrgTask } from "@/lib/ngo";
import { canMarkAttendance, SEAT_STATUSES, statusChip, turnout, type ChipTone } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { AttendanceForm } from "./attendance-form";
import { TurnoutExtras } from "./extras";

export const metadata: Metadata = { title: "Turnout view" };

const TILE: Record<ChipTone, string> = {
  green: "border-ok/30 bg-ok-soft text-ok",
  amber: "border-warn/30 bg-warn-soft text-warn",
  grey: "border-released/20 bg-released-soft text-released",
  red: "border-gap/30 bg-gap-soft text-gap",
  blue: "border-brand/20 bg-info-soft text-brand",
};

function Tile({ label, value, tone }: { label: string; value: number; tone: ChipTone }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", TILE[tone])}>
      <dd className="text-2xl leading-none font-bold tabular-nums">{value}</dd>
      <dt className="mt-1 text-xs font-semibold">{label}</dt>
    </div>
  );
}

// Screen 9: Turnout view (F7) with attendance marking (F5).
export default async function TurnoutPage(props: PageProps<"/ngo/tasks/[id]/turnout/[occ]">) {
  const { id, occ: occId } = await props.params;
  const { task } = await requireOrgTask(id);
  const at = await tick();
  const occ = await getOccurrence(occId);
  if (!occ || occ.task_id !== task.id) notFound();

  const bookings = await listBookingsForOccurrence(occ.id);
  const t = turnout(task.slots_needed, bookings);
  const profiles = await volunteerProfiles(bookings.map((b) => b.user_id), at);

  const marking = canMarkAttendance(occ.start_at, at);
  const started = at.getTime() >= occ.start_at.getTime();
  const seatHolders = bookings.filter((b) => SEAT_STATUSES.includes(b.status) && b.status !== "not_recorded");
  const chasing = await queryOne<{ value: number }>("select value from app_state where key = $1", [`chasing_minutes:${occ.id}`]);
  const order = { confirmed: 0, awaiting_confirmation: 1, booked: 1, attended: 0, no_show: 2 } as Record<string, number>;
  const sorted = [...bookings].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link href={`/ngo/tasks/${task.id}`} className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
          ← {task.title}
        </Link>
        <h1 className="text-2xl font-bold">Turnout view</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {task.title} · {fmtDate(occ.start_at)} · {fmtTimeRange(occ.start_at, occ.end_at)}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <Tile label="Needed" value={t.needed} tone="blue" />
          <Tile label="Booked" value={t.booked} tone="blue" />
          {started ? (
            <>
              <Tile label="Attended" value={bookings.filter((b) => b.status === "attended").length} tone="green" />
              <Tile label="No-show" value={bookings.filter((b) => b.status === "no_show").length} tone="red" />
            </>
          ) : (
            <>
              <Tile label="Confirmed" value={t.confirmed} tone="green" />
              <Tile label="Unconfirmed" value={t.unconfirmed} tone="amber" />
            </>
          )}
          <Tile label="Released" value={t.released} tone="grey" />
          {isEnabled("F11") ? (
            <Tile label="Filled by standby" value={t.filledByStandby} tone="green" />
          ) : (
            <Tile label="Gaps" value={t.gaps} tone={t.gaps > 0 ? "red" : "green"} />
          )}
        </dl>
        {isEnabled("F11") && t.gaps > 0 && !started && (
          <p className="mt-2 rounded-lg bg-gap-soft px-3 py-2 text-sm font-medium text-gap">
            {t.gaps} {t.gaps === 1 ? "seat" : "seats"} still to fill.
          </p>
        )}
        {isMvp && t.released > 0 && !started && (
          <p className="mt-2 rounded-lg border border-brand/20 bg-info-soft px-3 py-2 text-sm">
            <strong>Released slots:</strong> {t.released} released, {t.gaps} still open. The Show-Up team is offering
            open seats to standby volunteers.{" "}
            <Link href="/admin/released" className="text-brand underline underline-offset-2">Team queue</Link>
          </p>
        )}

        <TurnoutExtras occurrenceId={occ.id} taskId={task.id} now={at} />

        {marking && seatHolders.length > 0 && (
          <section className="mt-6 rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Mark attendance</h2>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">Tap each person to switch between Attended and No-show, then save.</p>
            <AttendanceForm
              taskId={task.id}
              occurrenceId={occ.id}
              chasingMinutes={chasing?.value ?? null}
              rows={seatHolders.map((b) => ({
                bookingId: b.id,
                name: shortName(b.user_name),
                mark: b.status === "attended" || b.status === "no_show" ? b.status : null,
              }))}
            />
          </section>
        )}
        {started && !marking && (
          <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm">The 72-hour window to mark attendance has closed.</p>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">Bookings</h2>
          {bookings.length === 0 && (
            <p className="mt-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">No bookings yet. Share the task link to fill your slots.</p>
          )}
          <ul className="mt-3 space-y-2">
            {sorted.map((b) => {
              const chip = statusChip(b.status, b.start_at, at);
              const holdsSeat = SEAT_STATUSES.includes(b.status);
              return (
                <li key={b.id} className="rounded-xl border bg-card p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {shortName(b.user_name)}
                        {isEnabled("F8") && <LevelBadge level={profiles.get(b.user_id)?.level ?? "new"} />}
                        {b.source === "standby" && <Chip tone="green">Filled by standby</Chip>}
                        {b.source === "admin" && <Chip tone="green">Filled by team</Chip>}
                      </p>
                      <p className="text-xs text-muted-foreground">{profiles.get(b.user_id)?.recordString}</p>
                    </div>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </div>
                  {/* Phone is shown only once a booking is accepted or confirmed (§6.1 Screen 8). */}
                  {holdsSeat && b.user_phone && (
                    <p className="mt-1 text-sm">
                      <a href={`tel:${b.user_phone}`} className="text-brand underline underline-offset-2">{fmtPhone(b.user_phone)}</a>
                    </p>
                  )}
                  {b.released_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Released {fmtDateTime(b.released_at)}
                      {b.release_reason ? ` · reason: ${b.release_reason}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
