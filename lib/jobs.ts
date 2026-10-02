import "server-only";
import { query } from "@/lib/db";
import {
  contactLine, getBooking, messageOrg, messageTask, messageVolunteer, placeOrLink,
} from "@/lib/data/bookings";
import { isEnabled } from "@/lib/flags";
import { MSG } from "@/lib/messages";
import { HOUR_MS, RULES } from "@/lib/rules";

// Scheduled jobs (§5.3, §5.4, §13). Runs every 15 minutes from /api/cron and is
// safe to run at any time: every message has a dedupe key, so it is never sent
// twice, and every state change is guarded by the current status.

export interface JobReport {
  awaiting: number;
  reminders: number;
  dayOf: number;
  attendancePrompts: number;
  notRecorded: number;
  extra: Record<string, number>;
}

type Hook = (now: Date, origin: string) => Promise<Record<string, number>>;
const hooks: Hook[] = [];
/** Prototype-only features (standby offers, guaranteed response) register their own jobs. */
export function registerJob(hook: Hook): void {
  if (!hooks.includes(hook)) hooks.push(hook);
}

const ids = async (sql: string, params: unknown[]) =>
  (await query<{ id: string }>(sql, params)).map((r) => r.id);

/** T−hours, or the booking time if the volunteer booked after that. */
const dueAt = (b: { start_at: Date; created_at: Date }, hoursBefore: number) =>
  new Date(Math.max(b.start_at.getTime() - hoursBefore * HOUR_MS, b.created_at.getTime()));

export async function runJobs(now: Date, origin: string): Promise<JobReport> {
  const report: JobReport = { awaiting: 0, reminders: 0, dayOf: 0, attendancePrompts: 0, notRecorded: 0, extra: {} };
  const at = (hours: number) => new Date(now.getTime() + hours * HOUR_MS);

  // T−48h: booked → awaiting_confirmation, and ask "I'm coming" / "Can't make it".
  for (const id of await ids(
    `update bookings b set status = 'awaiting_confirmation'
     from task_occurrences oc
     where oc.id = b.occurrence_id and b.status = 'booked' and oc.start_at > $1 and oc.start_at <= $2
     returning b.id`,
    [now, at(RULES.confirmRequestHours)],
  )) {
    const b = (await getBooking(id))!;
    const link = `${origin}/c/${b.confirm_token}`;
    await messageVolunteer(b, "confirmation_request", MSG.confirmationRequest({ ...messageTask(b), link }), {
      link, whatsappQueue: true, dueAt: dueAt(b, RULES.confirmRequestHours),
    });
    report.awaiting++;
  }

  // T−36h: still unconfirmed → reminder.
  for (const id of await ids(
    `select b.id from bookings b join task_occurrences oc on oc.id = b.occurrence_id
     where b.status = 'awaiting_confirmation' and oc.start_at > $1 and oc.start_at <= $2
       and not exists (select 1 from notifications n where n.dedupe_key like 'confirmation_reminder:' || b.id || '%')`,
    [now, at(RULES.confirmReminderHours)],
  )) {
    const b = (await getBooking(id))!;
    const link = `${origin}/c/${b.confirm_token}`;
    await messageVolunteer(b, "confirmation_reminder", MSG.confirmationReminder({ ...messageTask(b), link }), {
      link, whatsappQueue: true, dueAt: dueAt(b, RULES.confirmReminderHours),
    });
    report.reminders++;
  }

  // T−3h: day-of reminder to every active booking (no auto-cancel for the unconfirmed).
  for (const id of await ids(
    `select b.id from bookings b join task_occurrences oc on oc.id = b.occurrence_id
     where b.status in ('booked','awaiting_confirmation','confirmed') and oc.start_at > $1 and oc.start_at <= $2
       and not exists (select 1 from notifications n where n.dedupe_key like 'day_of_reminder:' || b.id || '%')`,
    [now, at(RULES.dayOfReminderHours)],
  )) {
    const b = (await getBooking(id))!;
    await messageVolunteer(
      b,
      "day_of_reminder",
      MSG.dayOfReminder({ ...messageTask(b), placeOrLink: placeOrLink(b), contact: contactLine(b), done: b.done_definition }),
      { whatsappQueue: true, dueAt: dueAt(b, RULES.dayOfReminderHours) },
    );
    report.dayOf++;
  }

  // Slot end: ask the NGO to mark attendance (once per occurrence).
  const ended = await query<{ id: string; task_id: string; org_id: string; title: string }>(
    `select oc.id, t.id as task_id, t.org_id, t.title
     from task_occurrences oc join tasks t on t.id = oc.task_id
     where oc.end_at <= $1 and oc.end_at > $2
       and exists (select 1 from bookings b where b.occurrence_id = oc.id and b.status in ('booked','awaiting_confirmation','confirmed'))
       and not exists (select 1 from notifications n where n.dedupe_key like 'ngo_attendance_prompt:' || oc.id || '%')`,
    [now, new Date(now.getTime() - RULES.attendanceWindowHours * HOUR_MS)],
  );
  for (const oc of ended) {
    const link = `${origin}/ngo/tasks/${oc.task_id}/turnout/${oc.id}`;
    await messageOrg(oc.org_id, "ngo_attendance_prompt", MSG.ngoAttendancePrompt({ task: oc.title, link }), link, `ngo_attendance_prompt:${oc.id}`);
    report.attendancePrompts++;
  }

  // 72h after the start with no mark → not_recorded (excluded from metrics).
  report.notRecorded = (
    await ids(
      `update bookings b set status = 'not_recorded'
       from task_occurrences oc
       where oc.id = b.occurrence_id and b.status in ('booked','awaiting_confirmation','confirmed') and oc.start_at < $1
       returning b.id`,
      [new Date(now.getTime() - RULES.attendanceWindowHours * HOUR_MS)],
    )
  ).length;

  if (isEnabled("F11") || isEnabled("F15") || isEnabled("F12")) {
    for (const hook of hooks) Object.assign(report.extra, await hook(now, origin));
  }
  return report;
}
