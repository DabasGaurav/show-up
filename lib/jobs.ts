import "server-only";
import { query } from "@/lib/db";
import { getSpot, orgEmails } from "@/lib/data/bookings";
import { listUpcoming } from "@/lib/data/tasks";
import { fmtDayDate, fmtPhone, fmtTime, fmtWeekday, mapLink } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { sendEmail } from "@/lib/notify";
import { DAY_MS, HOUR_MS, morningOf, RULES } from "@/lib/rules";

// The timed emails (spec §3, §4). Safe to run as often as you like: every email
// has a key, so it is never sent twice, and each step checks the current status.

export interface JobReport {
  stillOn: number;
  noReply: number;
  morningOf: number;
  afterTheDay: number;
  comeBack: number;
}

const ids = async (sql: string, params: unknown[]) => (await query<{ id: string }>(sql, params)).map((r) => r.id);

export async function runJobs(now: Date, origin: string, opts: { comeBack?: boolean } = {}): Promise<JobReport> {
  const report: JobReport = { stillOn: 0, noReply: 0, morningOf: 0, afterTheDay: 0, comeBack: 0 };
  const inHours = (h: number) => new Date(now.getTime() + h * HOUR_MS);

  // 2 days before: "Still on for {day}?"
  for (const id of await ids(
    `update bookings b set status = 'awaiting_confirmation'
     from task_occurrences oc
     where oc.id = b.occurrence_id and b.status = 'booked' and oc.start_at > $1 and oc.start_at <= $2
     returning b.id`,
    [now, inHours(RULES.checkInHours)],
  )) {
    const s = (await getSpot(id))!;
    await sendEmail({
      type: "still_on", to: s.user_email, userId: s.user_id, about: s.title, key: `still_on:${id}`,
      text: MSG.stillOn({ title: s.title, ngo: s.org_name, day: fmtWeekday(s.start_at), time: fmtTime(s.start_at), link: `${origin}/c/${s.confirm_token}` }),
    });
    report.stillOn++;
  }

  // 1.5 days before, no reply: one gentle reminder (never in the same breath as the first email).
  for (const id of await ids(
    `select b.id from bookings b join task_occurrences oc on oc.id = b.occurrence_id
     where b.status = 'awaiting_confirmation' and oc.start_at > $1 and oc.start_at <= $2
       and exists (select 1 from notifications n where n.dedupe_key = 'still_on:' || b.id and n.due_at <= $3)
       and not exists (select 1 from notifications n where n.dedupe_key = 'no_reply:' || b.id)`,
    [now, inHours(RULES.reminderHours), new Date(now.getTime() - 6 * HOUR_MS)],
  )) {
    const s = (await getSpot(id))!;
    await sendEmail({
      type: "no_reply", to: s.user_email, userId: s.user_id, about: s.title, key: `no_reply:${id}`,
      text: MSG.noReply({ title: s.title, ngo: s.org_name, day: fmtWeekday(s.start_at), time: fmtTime(s.start_at), link: `${origin}/c/${s.confirm_token}` }),
    });
    report.noReply++;
  }

  // Morning of: place or link, who to ask for, and "you're done when".
  const today = await query<{ id: string; start_at: Date }>(
    `select b.id, oc.start_at from bookings b join task_occurrences oc on oc.id = b.occurrence_id
     where b.status in ('booked','awaiting_confirmation','confirmed') and oc.start_at > $1 and oc.start_at <= $2
       and not exists (select 1 from notifications n where n.dedupe_key = 'morning_of:' || b.id)`,
    [now, inHours(24)],
  );
  for (const row of today) {
    if (now.getTime() < morningOf(row.start_at).getTime()) continue;
    const s = (await getSpot(row.id))!;
    const place = s.mode === "online" ? (s.online_link ?? "online") : `${[s.address, s.city].filter(Boolean).join(", ")} (${mapLink(s.lat, s.lng, s.address)})`;
    await sendEmail({
      type: "morning_of", to: s.user_email, userId: s.user_id, about: s.title, key: `morning_of:${row.id}`,
      text: MSG.morningOf({
        title: s.title, ngo: s.org_name, day: fmtWeekday(s.start_at), time: fmtTime(s.start_at),
        placeOrLink: place, contact: `${s.contact_name} (${fmtPhone(s.contact_phone)})`, done: s.done_definition,
      }),
    });
    report.morningOf++;
  }

  // After the day: ask the NGO to mark who came (while they still can).
  const ended = await query<{ id: string; activity_id: string; org_id: string; title: string }>(
    `select oc.id, t.id as activity_id, t.org_id, t.title
     from task_occurrences oc join tasks t on t.id = oc.task_id
     where oc.end_at <= $1 and oc.start_at > $2
       and exists (select 1 from bookings b where b.occurrence_id = oc.id and b.status in ('booked','awaiting_confirmation','confirmed'))
       and not exists (select 1 from notifications n where n.dedupe_key like 'after_the_day:' || oc.id || ':%')`,
    [now, new Date(now.getTime() - RULES.markDays * DAY_MS)],
  );
  for (const d of ended) {
    const text = MSG.afterTheDay({ title: d.title, link: `${origin}/dashboard/a/${d.activity_id}?d=${d.id}` });
    for (const m of await orgEmails(d.org_id)) {
      await sendEmail({ type: "after_the_day", to: m.email, userId: m.id, about: d.title, key: `after_the_day:${d.id}:${m.id}`, text });
    }
    report.afterTheDay++;
  }

  if (opts.comeBack) report.comeBack = await comeBack(now, origin);
  return report;
}

/**
 * Come back: someone who has not saved a spot in 30 days gets one email with three
 * upcoming activities in their city or online. Then we wait another 30 days.
 */
async function comeBack(now: Date, origin: string): Promise<number> {
  const since = new Date(now.getTime() - RULES.comeBackDays * DAY_MS);
  const people = await query<{ id: string; email: string; city: string | null }>(
    `select u.id, u.email, u.city from users u
     where u.role = 'volunteer' and u.email is not null and u.created_at < $1
       and not exists (select 1 from bookings b where b.user_id = u.id and b.created_at >= $1)
       and not exists (select 1 from notifications n where n.user_id = u.id and n.type = 'come_back' and n.due_at >= $1)`,
    [since],
  );
  if (people.length === 0) return 0;
  const upcoming = await listUpcoming(now);
  let sent = 0;
  for (const p of people) {
    const picks = upcoming
      .filter((a) => a.taken < a.slots_needed && (a.mode === "online" || !p.city || a.city === p.city))
      .slice(0, RULES.comeBackActivities);
    if (picks.length < RULES.comeBackActivities) continue;
    const list = picks.map((a) => `• ${a.title}, ${fmtDayDate(a.date_start)} at ${fmtTime(a.date_start)}: ${origin}/a/${a.share_slug}`).join("\n");
    const res = await sendEmail({
      type: "come_back", to: p.email, userId: p.id, key: `come_back:${p.id}:${now.toISOString().slice(0, 10)}`, text: MSG.comeBack({ list }),
    });
    if (res !== "duplicate") sent++;
  }
  return sent;
}
