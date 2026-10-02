import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { ApplicantCard } from "@/components/applicant-card";
import { Chip } from "@/components/badges";
import { Countdown } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { listBookingsForTask } from "@/lib/data/bookings";
import { volunteerProfiles } from "@/lib/data/volunteers";
import { requireFeature } from "@/lib/flags";
import { fmtDateShort, fmtPhone, fmtTime } from "@/lib/format";
import { requireOrgTask } from "@/lib/ngo";
import { responseDeadline, SEAT_STATUSES, statusChip } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { decideAction } from "./actions";

export const metadata: Metadata = { title: "Applicants" };

// Screen 8: Applicant profiles (F8, F6). Prototype only.
export default async function ApplicantsPage(props: PageProps<"/ngo/tasks/[id]/applicants">) {
  requireFeature("F8");
  const { id } = await props.params;
  const { task } = await requireOrgTask(id);
  const at = await tick();
  const bookings = (await listBookingsForTask(task.id)).filter((b) => !["released_early", "released_late", "auto_released"].includes(b.status));
  const profiles = await volunteerProfiles(bookings.map((b) => b.user_id), at);
  const pending = bookings.filter((b) => b.status === "requested");
  const others = bookings.filter((b) => b.status !== "requested");
  const multi = new Set(bookings.map((b) => b.occurrence_id)).size > 1;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Link href={`/ngo/tasks/${task.id}`} className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">
          ← {task.title}
        </Link>
        <h1 className="text-2xl font-bold">Applicants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {task.booking_mode === "approval"
            ? "Decide from each person's record. Reply within 48 hours or the request is released automatically."
            : "Everyone who booked this task, with their reliability record."}
        </p>

        {pending.length > 0 && (
          <section className="mt-6">
            <h2 className="font-semibold">Waiting for your reply ({pending.length})</h2>
            <ul className="mt-3 space-y-3">
              {pending.map((b) => {
                const p = profiles.get(b.user_id);
                if (!p) return null;
                const deadline = responseDeadline(b.created_at);
                return (
                  <li key={b.id}>
                    <ApplicantCard p={p} context={{ task_id: task.id }} status={<Chip tone="amber">Reply in <Countdown deadline={deadline.getTime()} serverNow={at.getTime()} /></Chip>}>
                      {multi && <p className="mt-1 text-xs text-muted-foreground">For {fmtDateShort(b.start_at)}, {fmtTime(b.start_at)}</p>}
                      <form action={decideAction} className="mt-3 grid grid-cols-2 gap-2">
                        <input type="hidden" name="task_id" value={task.id} />
                        <input type="hidden" name="booking_id" value={b.id} />
                        <Button type="submit" name="decision" value="accept" size="tap">Accept</Button>
                        <Button type="submit" name="decision" value="decline" size="tap" variant="outline">Decline</Button>
                      </form>
                    </ApplicantCard>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-6">
          <h2 className="font-semibold">{task.booking_mode === "approval" ? "Decided" : "Booked"} ({others.length})</h2>
          {bookings.length === 0 && (
            <p className="mt-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">Nobody has applied yet. Share the task link to get started.</p>
          )}
          <ul className="mt-3 space-y-3">
            {others.map((b) => {
              const p = profiles.get(b.user_id);
              if (!p) return null;
              const chip = b.status === "declined" ? { label: "Declined", tone: "grey" as const } : statusChip(b.status, b.start_at, at);
              // Phone is hidden until the booking is accepted or confirmed.
              const phone = SEAT_STATUSES.includes(b.status) && p.phone ? fmtPhone(p.phone) : null;
              return (
                <li key={b.id}>
                  <ApplicantCard p={p} phone={phone} context={{ task_id: task.id }} status={<Chip tone={chip.tone}>{chip.label}</Chip>}>
                    {multi && <p className="mt-1 text-xs text-muted-foreground">For {fmtDateShort(b.start_at)}, {fmtTime(b.start_at)}</p>}
                  </ApplicantCard>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </>
  );
}
