import "server-only";
import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import { setNow } from "@/lib/clock";
import { newToken } from "@/lib/data/bookings";
import { getDb, query, queryOne } from "@/lib/db";
import { istDateKey, istToDate } from "@/lib/format";
import { runJobs } from "@/lib/jobs";
import { DAY_MS, HOUR_MS } from "@/lib/rules";
import { reseed, SEED_IDS } from "@/supabase/seed";

// Test Lab (PRD §9): runs each solution-hypothesis test with a real tester and
// records the evidence for Appendix A.2. Prototype mode only.

export type ScenarioId = "SH1" | "SH2" | "SH3" | "SH4" | "SH5" | "SH6" | "SH7";
export type Persona = "Volunteer" | "Lapsed volunteer" | "NGO coordinator";

export interface Scenario {
  id: ScenarioId;
  persona: Persona;
  title: string;
  /** Read aloud to the tester. */
  script: string;
  setup: string;
  captured: string;
  passRule: string;
  /** Asked by the facilitator after the task. */
  followUp?: { key: string; question: string; type: "yesno" | "number" };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "SH1", persona: "Volunteer", title: "Find and book from the feed",
    script: "Find and book a task that fits your free time this weekend and a cause you care about.",
    setup: "Opens the feed as the sample volunteer (Delhi NCR; Teaching and Plantation saved).",
    captured: "Time from start to booking; filters used; whether “Contact NGO” was tapped.",
    passRule: "Booked unaided in under 3 minutes, with no “Contact NGO” before booking.",
  },
  {
    id: "SH2", persona: "Volunteer", title: "Trust an unfamiliar verified NGO",
    script: "Choose one of these three tasks and book it.",
    setup: "Feed preset to three similar health-camp tasks: one from an unfamiliar Verified NGO with reviews and a response rate, two from an unverified group.",
    captured: "Which task was booked; time; task pages (NGO profile panels) opened.",
    passRule: "Books with the unfamiliar verified NGO without asking for a referral.",
  },
  {
    id: "SH3", persona: "Volunteer", title: "Release instead of a no-show",
    script: "Your plans just changed. Do what you'd do.",
    setup: "The tester has a booking. The clock jumps to 30 hours before the start and the 48-hour confirmation appears.",
    captured: "Action taken (release / confirm / ignore); time to act; reason chosen.",
    passRule: "Releases the slot.",
    followUp: { key: "would_do_in_real_life", question: "Would you do this in real life?", type: "yesno" },
  },
  {
    id: "SH4", persona: "Lapsed volunteer", title: "Come back from a nudge",
    script: "Here's your phone. Do what you'd normally do.",
    setup: "The sample volunteer was last active 45 days ago. The home screen opens with the nudge card.",
    captured: "Nudge opened / dismissed; booked from the nudge.",
    passRule: "Opens the nudge and books a task.",
  },
  {
    id: "SH5", persona: "NGO coordinator", title: "Decide from applicant profiles",
    script: "Five people applied for your Saturday food drive. Decide who you'd accept.",
    setup: "Five preset applicants with mixed reliability records.",
    captured: "Accept or decline per applicant; time; profile details opened.",
    passRule: "Decides on all five from the profiles.",
    followUp: { key: "would_skip_screening_call", question: "Would you skip your usual screening call?", type: "yesno" },
  },
  {
    id: "SH6", persona: "NGO coordinator", title: "Post a task with the template",
    script: "Post one of your real upcoming tasks.",
    setup: "Opens the task template as the sample NGO coordinator.",
    captured: "Time from open to publish; fields edited; validation errors.",
    passRule: "Publishes in under 5 minutes.",
    followUp: { key: "needs_briefing_call", question: "Does this need a briefing call?", type: "yesno" },
  },
  {
    id: "SH7", persona: "NGO coordinator", title: "Plan sign-ups with standby cover",
    script: "You need 15 people for a drive. Look at this turnout view with standby cover, then tell us how many sign-ups you'd aim for.",
    setup: "Turnout view for a 15-person drive, 24 hours before the start, with released seats and standby cover.",
    captured: "Number entered in the planning widget.",
    passRule: "Enters fewer extra sign-ups than the tester's current practice.",
    followUp: { key: "aims_for_today", question: "How many do you aim for today?", type: "number" },
  },
];

export const scenario = (id: string) => SCENARIOS.find((s) => s.id === id);

export interface LabSession {
  id: string;
  scenario: ScenarioId;
  tester_id: string;
  persona: string;
  started_at: Date;
  ended_at: Date | null;
  outcome: {
    start_url?: string;
    captured?: Record<string, unknown>;
    suggested?: "Pass" | "Fail" | "Partial";
    result?: "Pass" | "Fail" | "Partial";
    answers?: Record<string, string>;
  };
  facilitator_notes: string | null;
  quote: string | null;
}

const LAB_COOKIE = "su_lab_session";

/** The coming Thursday at 10:00 IST: a fixed weekday so "this weekend" is always two days away. */
export function labBase(realNow: Date): Date {
  for (let i = 0; i < 8; i++) {
    const d = new Date(realNow.getTime() + i * DAY_MS);
    const at = istToDate(istDateKey(d), "10:00");
    if (new Date(`${istDateKey(d)}T12:00:00Z`).getUTCDay() === 4 && at.getTime() > realNow.getTime()) return at;
  }
  return realNow;
}

/** Resets the sample data to the scenario's starting state and returns where the tester starts. */
async function prepare(id: ScenarioId, origin: string): Promise<{ userId: string; startUrl: string }> {
  const db = await getDb();
  const base = labBase(new Date());
  await reseed(db, base);
  await setNow(base);
  const volunteer = SEED_IDS.testerVolunteer;
  const coordinator = SEED_IDS.testerCoordinator;

  switch (id) {
    case "SH1":
      return { userId: volunteer, startUrl: "/feed" };
    case "SH2":
      return { userId: volunteer, startUrl: `/feed?ids=${SEED_IDS.sh2Tasks.join(",")}` };
    case "SH3": {
      const occ = (await queryOne<{ start_at: Date }>("select start_at from task_occurrences where id = $1", [SEED_IDS.sh3Occurrence]))!;
      const token = newToken();
      await query(
        `insert into bookings (occurrence_id, user_id, status, source, confirm_token, created_at)
         values ($1, $2, 'booked', 'feed', $3, $4)`,
        [SEED_IDS.sh3Occurrence, volunteer, token, new Date(base.getTime() - 2 * DAY_MS)],
      );
      // Jump to T−30h: the booking is awaiting confirmation and release is still free.
      const at = new Date(occ.start_at.getTime() - 30 * HOUR_MS);
      await setNow(at);
      await runJobs(at, origin);
      return { userId: volunteer, startUrl: `/c/${token}` };
    }
    case "SH4":
      await query("update users set last_active_at = $2 where id = $1", [volunteer, new Date(base.getTime() - 45 * DAY_MS)]);
      return { userId: volunteer, startUrl: "/feed" };
    case "SH5":
      return { userId: coordinator, startUrl: `/ngo/tasks/${SEED_IDS.sh5Task}/applicants` };
    case "SH6":
      return { userId: coordinator, startUrl: "/ngo/tasks/new" };
    case "SH7": {
      const occ = (await queryOne<{ start_at: Date }>("select start_at from task_occurrences where id = $1", [SEED_IDS.sh7Occurrence]))!;
      // The day before, 24 hours out: unconfirmed bookings now show amber.
      const at = new Date(occ.start_at.getTime() - 24 * HOUR_MS);
      await setNow(at);
      // Keep the standby story current: one seat filled earlier today, one still finding cover.
      await query(
        `update bookings set released_at = case when release_reason = 'work' then $2::timestamptz else $3::timestamptz end
         where occurrence_id = $1 and status = 'released_early'`,
        [SEED_IDS.sh7Occurrence, new Date(at.getTime() - 7 * HOUR_MS), new Date(at.getTime() - HOUR_MS)],
      );
      await query(
        `update standby_offers set sent_at = $2, expires_at = $3 where occurrence_id = $1 and status = 'sent'`,
        [SEED_IDS.sh7Occurrence, new Date(at.getTime() - HOUR_MS), new Date(at.getTime() + HOUR_MS)],
      );
      await runJobs(at, origin);
      return { userId: coordinator, startUrl: `/ngo/tasks/${SEED_IDS.sh7Task}/turnout/${SEED_IDS.sh7Occurrence}` };
    }
  }
}

export async function createSession(id: ScenarioId, testerId: string, persona: string, origin: string): Promise<LabSession> {
  const { userId, startUrl } = await prepare(id, origin);
  const [session] = await query<LabSession>(
    `insert into lab_sessions (scenario, tester_id, persona, outcome) values ($1, $2, $3, $4::jsonb) returning *`,
    [id, testerId, persona, JSON.stringify({ start_url: startUrl, user_id: userId })],
  );
  return session;
}

/** Opens the app in tester view: signs in as the sample account and starts the timer. */
export async function beginSession(session: LabSession): Promise<string> {
  const userId = (session.outcome as { user_id?: string }).user_id;
  if (userId) await signIn(userId);
  await query("update lab_sessions set started_at = now() where id = $1", [session.id]);
  (await cookies()).set(LAB_COOKIE, session.id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 4 });
  await query("insert into events (user_id, session_id, name, props) values ($1, $2, 'lab_session_started', $3::jsonb)", [
    userId ?? null, session.id, JSON.stringify({ scenario: session.scenario, tester_id: session.tester_id }),
  ]);
  return session.outcome.start_url ?? "/";
}

export async function activeSession(): Promise<LabSession | null> {
  const id = (await cookies()).get(LAB_COOKIE)?.value;
  if (!id) return null;
  const s = await getSession(id);
  return s && s.ended_at === null ? s : null;
}

export async function getSession(id: string): Promise<LabSession | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<LabSession>("select * from lab_sessions where id = $1", [id]);
}

export async function listSessions(): Promise<LabSession[]> {
  return query<LabSession>("select * from lab_sessions order by started_at desc limit 200");
}

interface Ev {
  name: string;
  props: Record<string, unknown>;
  created_at: Date;
}

/** Turns the session's event log into the scenario's auto-captured metrics and a suggested outcome. */
export async function capture(s: LabSession, endedAt: Date): Promise<{ captured: Record<string, unknown>; suggested: "Pass" | "Fail" | "Partial" }> {
  const events = await query<Ev>("select name, props, created_at from events where session_id = $1 order by created_at", [s.id]);
  const first = (name: string) => events.find((e) => e.name === name);
  const all = (name: string) => events.filter((e) => e.name === name);
  const secs = (e?: Ev) => (e ? Math.round((e.created_at.getTime() - s.started_at.getTime()) / 1000) : null);
  const total = Math.round((endedAt.getTime() - s.started_at.getTime()) / 1000);
  const booking = first("booking_created");
  const taskName = async (id: unknown) =>
    (await queryOne<{ label: string }>("select t.title || ' · ' || o.name as label from tasks t join organisations o on o.id = t.org_id where t.id::text = $1", [String(id)]))?.label ?? null;

  switch (s.scenario) {
    case "SH1": {
      const contact = first("contact_ngo_tapped");
      const contactBefore = !!contact && (!booking || contact.created_at < booking.created_at);
      const captured = {
        booked: !!booking,
        seconds_to_booking: secs(booking),
        task_booked: booking ? await taskName(booking.props.task_id) : null,
        filters_used: [...new Set(all("filter_changed").map((e) => String(e.props.filter)))],
        filter_changes: all("filter_changed").length,
        contact_ngo_tapped_before_booking: contactBefore,
        total_seconds: total,
      };
      const ok = !!booking && (captured.seconds_to_booking ?? 999) < 180 && !contactBefore;
      return { captured, suggested: ok ? "Pass" : booking ? "Partial" : "Fail" };
    }
    case "SH2": {
      const verified = booking?.props.task_id === SEED_IDS.sh2Tasks[0];
      const captured = {
        booked: !!booking,
        task_booked: booking ? await taskName(booking.props.task_id) : null,
        booked_verified_ngo: verified,
        seconds_to_booking: secs(booking),
        task_pages_opened: new Set(all("task_viewed").map((e) => String(e.props.task_id))).size,
        contact_ngo_tapped: !!first("contact_ngo_tapped"),
        total_seconds: total,
      };
      return { captured, suggested: verified ? "Pass" : "Fail" };
    }
    case "SH3": {
      const released = first("booking_released");
      const confirmed = first("booking_confirmed");
      const act = released ?? confirmed;
      const captured = {
        action: released ? "release" : confirmed ? "confirm" : "ignore",
        release_type: released?.props.type ?? null,
        reason: released?.props.reason ?? null,
        seconds_to_act: secs(act),
        total_seconds: total,
      };
      return { captured, suggested: released ? "Pass" : "Fail" };
    }
    case "SH4": {
      const opened = first("nudge_opened");
      const dismissed = first("nudge_dismissed");
      const fromNudge = !!booking && !!opened && opened.created_at < booking.created_at;
      const captured = {
        nudge_shown: !!first("nudge_shown"),
        nudge_opened: !!opened,
        nudge_dismissed: dismissed ? String(dismissed.props.how) : null,
        booked: !!booking,
        booked_from_nudge: fromNudge,
        task_booked: booking ? await taskName(booking.props.task_id) : null,
        seconds_to_booking: secs(booking),
        total_seconds: total,
      };
      return { captured, suggested: fromNudge ? "Pass" : opened ? "Partial" : "Fail" };
    }
    case "SH5": {
      const decisions = all("applicant_decided");
      const names = await query<{ id: string; name: string }>("select id, name from users where id::text = any($1::text[])", [
        decisions.map((d) => String(d.props.applicant_id)),
      ]);
      const latest = new Map<string, string>();
      for (const d of decisions) latest.set(String(d.props.applicant_id), String(d.props.decision));
      const captured = {
        decided: latest.size,
        decisions: [...latest].map(([id, decision]) => `${names.find((n) => n.id === id)?.name ?? id}: ${decision}`),
        accepted: [...latest.values()].filter((d) => d === "accept").length,
        declined: [...latest.values()].filter((d) => d === "decline").length,
        seconds_to_decide_all: secs(decisions.at(-1)),
        profile_details_opened: new Set(all("lab_profile_opened").map((e) => String(e.props.applicant_id))).size,
        total_seconds: total,
      };
      return { captured, suggested: latest.size >= 5 ? "Pass" : latest.size > 0 ? "Partial" : "Fail" };
    }
    case "SH6": {
      const published = first("task_published");
      const captured = {
        published: !!published,
        seconds_to_publish: published ? (published.props.seconds_to_publish ?? secs(published)) : null,
        fields_edited: published?.props.fields_edited ?? [],
        validation_errors: all("lab_validation_error").length,
        fields_with_errors: [...new Set(all("lab_validation_error").flatMap((e) => (e.props.fields as string[]) ?? []))],
        total_seconds: total,
      };
      const ok = !!published && Number(captured.seconds_to_publish ?? 999) < 300;
      return { captured, suggested: ok ? "Pass" : published ? "Partial" : "Fail" };
    }
    case "SH7": {
      const answer = all("lab_planning_answer").at(-1);
      const planned = answer ? Number(answer.props.planned_signups) : null;
      const captured = {
        needed: 15,
        planned_signups: planned,
        extra_signups: planned === null ? null : planned - 15,
        total_seconds: total,
      };
      // Final outcome needs the facilitator's "current practice" number; see finalise().
      return { captured, suggested: planned === null ? "Fail" : "Partial" };
    }
  }
}

export async function endSession(s: LabSession): Promise<void> {
  const endedAt = new Date();
  const { captured, suggested } = await capture(s, endedAt);
  await query(
    "update lab_sessions set ended_at = $2, outcome = outcome || $3::jsonb where id = $1 and ended_at is null",
    [s.id, endedAt, JSON.stringify({ captured, suggested })],
  );
  await query("insert into events (session_id, name, props) values ($1, 'lab_session_ended', $2::jsonb)", [
    s.id, JSON.stringify({ scenario: s.scenario, suggested }),
  ]);
  (await cookies()).delete(LAB_COOKIE);
  // Back to real time so the next person browsing the prototype is not confused.
  await setNow(null);
}

export async function saveFacilitatorForm(
  id: string,
  f: { result: "Pass" | "Fail" | "Partial"; answers: Record<string, string>; quote: string; notes: string },
): Promise<void> {
  await query(
    "update lab_sessions set outcome = outcome || $2::jsonb, quote = $3, facilitator_notes = $4 where id = $1",
    [id, JSON.stringify({ result: f.result, answers: f.answers }), f.quote || null, f.notes || null],
  );
}

export async function setSuggested(id: string, suggested: "Pass" | "Fail" | "Partial"): Promise<void> {
  await query("update lab_sessions set outcome = outcome || $2::jsonb where id = $1", [id, JSON.stringify({ suggested })]);
}

/** SH7 passes when the tester plans fewer sign-ups than they aim for today. */
export function sh7Suggestion(planned: number | null, aimsForToday: number | null): "Pass" | "Fail" | "Partial" {
  if (planned === null) return "Fail";
  if (aimsForToday === null) return "Partial";
  return planned < aimsForToday ? "Pass" : "Fail";
}
