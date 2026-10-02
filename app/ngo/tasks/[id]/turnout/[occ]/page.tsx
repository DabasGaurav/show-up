import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyArt } from "@/components/art";
import { Avatar, LevelMark, Pill, TrackRecord, WhoBar } from "@/components/kit";
import { buttonVariants } from "@/components/ui/button";
import { RELEASE_REASON_LABEL } from "@/lib/constants";
import { listBookingsForOccurrence } from "@/lib/data/bookings";
import { getOccurrence } from "@/lib/data/tasks";
import { volunteerProfiles } from "@/lib/data/volunteers";
import { queryOne } from "@/lib/db";
import { isEnabled } from "@/lib/flags";
import { fmtDayDate, fmtPhone, fmtTimeRange, shortName, waLink } from "@/lib/format";
import { ngoPill, trackRecord } from "@/lib/labels";
import { requireOrgTask } from "@/lib/ngo";
import { canMarkAttendance, SEAT_STATUSES } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { AttendanceForm } from "./attendance-form";
import { TurnoutExtras } from "./extras";

export const metadata: Metadata = { title: "Who's coming" };

// Who's coming (brief B10), and "Mark who came" after the day.
export default async function WhosComingPage(props: PageProps<"/ngo/tasks/[id]/turnout/[occ]">) {
  const { id, occ: occId } = await props.params;
  const { task } = await requireOrgTask(id);
  const at = await tick();
  const occ = await getOccurrence(occId);
  if (!occ || occ.task_id !== task.id) notFound();

  const bookings = (await listBookingsForOccurrence(occ.id)).filter((b) => !["declined", "auto_released", "requested"].includes(b.status));
  const profiles = await volunteerProfiles(bookings.map((b) => b.user_id), at);
  const started = at.getTime() >= occ.start_at.getTime();
  const marking = canMarkAttendance(occ.start_at, at);
  const seatHolders = bookings.filter((b) => SEAT_STATUSES.includes(b.status) && b.status !== "not_recorded");
  const freed = bookings.filter((b) => b.status === "released_early" || b.status === "released_late");
  const coming = bookings.filter((b) => b.status === "confirmed").length;
  const saved = bookings.filter((b) => b.status === "booked").length;
  const waiting = bookings.filter((b) => b.status === "awaiting_confirmation").length;
  const came = bookings.filter((b) => b.status === "attended").length;
  const missed = bookings.filter((b) => b.status === "no_show").length;
  const open = task.slots_needed - coming - saved - waiting;
  const chasing = await queryOne<{ value: number }>("select value from app_state where key = $1", [`chasing_minutes:${occ.id}`]);
  const order: Record<string, number> = { confirmed: 0, attended: 0, awaiting_confirmation: 1, booked: 1, no_show: 2 };
  const sorted = [...bookings].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <Link href={`/ngo/tasks/${task.id}`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-2">← Link and dates</Link>
        <h1 className="text-4xl leading-10 text-balance">{task.title}</h1>
        <p className="mt-2 text-ink-soft">{fmtDayDate(occ.start_at)} · {fmtTimeRange(occ.start_at, occ.end_at)}</p>

        <section className="mt-5 rounded-xl bg-card p-5" aria-label="Who's coming">
          {started ? (
            <p className="font-heading text-2xl font-semibold">
              {came + missed > 0 ? <><span className="text-ok">{came} of {came + missed}</span> came</> : "Who came?"}
            </p>
          ) : (
            <WhoBar counts={{ needed: task.slots_needed, coming, saved, waiting, freed: freed.length }} />
          )}
        </section>

        {!started && open > 0 && freed.slice(-2).map((b) => (
          <p key={b.id} className="mt-3 rounded-xl bg-accent-soft px-4 py-3 font-medium">
            {b.user_name.split(" ")[0]} freed their spot{b.release_reason ? ` (${RELEASE_REASON_LABEL[b.release_reason].toLowerCase()})` : ""}. We&apos;re finding someone.
          </p>
        ))}

        <TurnoutExtras occurrenceId={occ.id} taskId={task.id} now={at} />

        {marking && seatHolders.length > 0 && (
          <section className="mt-6 rounded-xl bg-card p-5">
            <h2 className="text-2xl">Mark who came</h2>
            <p className="mt-1 mb-4 text-ink-soft">Tap ✓ or ✕ for each person. It takes 30 seconds.</p>
            <AttendanceForm
              taskId={task.id}
              occurrenceId={occ.id}
              chasingMinutes={chasing?.value ?? null}
              rows={seatHolders.map((b) => ({ bookingId: b.id, name: shortName(b.user_name), mark: b.status === "attended" || b.status === "no_show" ? b.status : null }))}
            />
          </section>
        )}

        <section className="mt-7">
          <h2 className="text-2xl">People</h2>
          {bookings.length === 0 ? (
            <div className="mt-3 rounded-xl bg-card p-6 text-center">
              <EmptyArt />
              <p className="mt-3 font-heading text-xl font-semibold">Nobody yet.</p>
              <Link href={`/ngo/tasks/${task.id}`} className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Share your link</Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {sorted.map((b) => {
                const pill = ngoPill(b.status, b.start_at, at);
                const p = profiles.get(b.user_id);
                // The phone number is shown only for people who have confirmed.
                const phone = (b.status === "confirmed" || b.status === "attended") && b.user_phone ? b.user_phone : null;
                return (
                  <li key={b.id} className="rounded-xl bg-card p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={b.user_name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-2 font-semibold">
                            {shortName(b.user_name)}
                            {isEnabled("F8") && <LevelMark level={p?.level ?? "new"} />}
                          </p>
                          <Pill tone={pill.tone}>
                            {pill.label}
                            {b.release_reason ? ` · ${RELEASE_REASON_LABEL[b.release_reason].toLowerCase()}` : ""}
                          </Pill>
                        </div>
                        <TrackRecord record={trackRecord(p?.facts ?? [])} className="mt-1" />
                        {b.source !== "link" && b.source !== "feed" && SEAT_STATUSES.includes(b.status) && (
                          <p className="mt-1 text-sm text-ok">Stepped in for a freed spot</p>
                        )}
                        {phone && (
                          <p className="mt-2 flex flex-wrap gap-2">
                            <a href={`tel:${phone}`} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-11")}><Phone aria-hidden />{fmtPhone(phone)}</a>
                            <a href={waLink(phone, "")} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "h-11")}><MessageCircle aria-hidden />WhatsApp</a>
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
