import { beforeAll, describe, expect, it } from "vitest";
import { publishTaskAction } from "@/app/ngo/tasks/new/actions";
import { decideAction } from "@/app/ngo/tasks/[id]/applicants/actions";
import { releaseAction } from "@/app/c/[token]/actions";
import { planningAnswerAction, saveFormAction } from "@/app/lab/actions";
import { bookAction } from "@/app/t/[slug]/book/actions";
import { trackAction } from "@/app/actions/track";
import { getUser, unlock } from "@/lib/auth";
import { now } from "@/lib/clock";
import { applyFilters, listFeed, parseFilters } from "@/lib/data/feed";
import { nudgeFor } from "@/lib/data/nudges";
import { query } from "@/lib/db";
import { istDateKey } from "@/lib/format";
import {
  beginSession, capture, createSession, endSession, getSession, labBase, listSessions, type LabSession, type ScenarioId,
} from "@/lib/lab";
import { DAY_MS } from "@/lib/rules";
import { SEED_IDS } from "@/supabase/seed";
import { GET as exportCsv } from "@/app/lab/export/route";
import { cookieJar } from "./setup";

// One end-to-end test per Test Lab scenario (PRD §14): set up the scenario, act as
// the tester through the app's own server actions, end the task, and check the
// evidence the lab captured.

const ORIGIN = "https://test.local";

async function start(id: ScenarioId, tester: string): Promise<{ session: LabSession; startUrl: string }> {
  const session = await createSession(id, tester, "", ORIGIN);
  const startUrl = await beginSession(session);
  return { session: (await getSession(session.id))!, startUrl };
}

async function finish(session: LabSession) {
  await endSession(session);
  return (await getSession(session.id))!.outcome;
}

/** Server actions end in redirect(), which throws; that is their success path. */
async function act(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    const digest = (e as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) return digest.split(";")[2];
    throw e;
  }
}

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
};

const slugAndOcc = async (taskId: string) =>
  (await query<{ share_slug: string; id: string }>(
    "select t.share_slug, oc.id from tasks t join task_occurrences oc on oc.task_id = t.id where t.id = $1 order by oc.start_at limit 1",
    [taskId],
  ))[0];

beforeAll(async () => {
  expect(await unlock("lab", "showup-lab")).toBe(true);
});

describe("Test Lab scenarios (§9)", () => {
  it("pins the lab clock to a Thursday morning", () => {
    for (let i = 0; i < 7; i++) {
      const base = labBase(new Date(Date.UTC(2026, 9, 5 + i, 12)));
      expect(new Date(`${istDateKey(base)}T12:00:00Z`).getUTCDay()).toBe(4);
      expect(base.getTime()).toBeGreaterThan(Date.UTC(2026, 9, 5 + i, 12));
      expect(base.getTime() - Date.UTC(2026, 9, 5 + i, 12)).toBeLessThanOrEqual(7 * DAY_MS);
    }
  });

  it("SH1: finds and books a weekend task from the feed", async () => {
    const { session, startUrl } = await start("SH1", "T-V1");
    expect(startUrl).toBe("/feed");
    const user = (await getUser())!;
    expect(user.id).toBe(SEED_IDS.testerVolunteer);

    await trackAction("filter_changed", { filter: "date", value: "weekend" });
    await trackAction("filter_changed", { filter: "cause", value: "Teaching" });
    const at = await now();
    const results = applyFilters(await listFeed(at), parseFilters({ date: "weekend", cause: "Teaching,Plantation" }, user.city!), at);
    const pickable = results.filter((t) => t.min_trust !== "trusted" && t.booking_mode === "instant" && t.seats_taken < t.slots_needed);
    expect(pickable.length).toBeGreaterThanOrEqual(2);
    const t = pickable[0];
    expect(await act(() => bookAction({}, form({ slug: t.share_slug, occurrence_id: t.occurrence_id, source: "feed" })))).toMatch(/^\/me\?booked=/);

    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ booked: true, filters_used: ["date", "cause"], contact_ngo_tapped_before_booking: false });
    expect(Number(o.captured!.seconds_to_booking)).toBeLessThan(180);
  });

  it("SH1: tapping Contact NGO before booking is not a pass", async () => {
    const { session } = await start("SH1", "T-V2");
    await trackAction("contact_ngo_tapped", { task_id: "x" });
    const t = await slugAndOcc(SEED_IDS.sh2Tasks[0]);
    await act(() => bookAction({}, form({ slug: t.share_slug, occurrence_id: t.id, source: "feed" })));
    const o = await finish(session);
    expect(o.suggested).toBe("Partial");
    expect(o.captured).toMatchObject({ booked: true, contact_ngo_tapped_before_booking: true });
  });

  it("SH2: books with the unfamiliar verified NGO", async () => {
    const { session, startUrl } = await start("SH2", "T-V3");
    expect(startUrl).toBe(`/feed?ids=${SEED_IDS.sh2Tasks.join(",")}`);
    const at = await now();
    const three = applyFilters(await listFeed(at), parseFilters({ ids: SEED_IDS.sh2Tasks.join(",") }, "Delhi NCR"), at);
    expect(three).toHaveLength(3);
    expect(three.filter((t) => t.org_verified_at !== null).map((t) => t.org_name)).toEqual(["Swasthya Saathi"]);
    // The tester has never volunteered with the verified NGO.
    const before = await query(
      `select 1 from bookings b join task_occurrences oc on oc.id = b.occurrence_id join tasks t on t.id = oc.task_id
       join organisations o on o.id = t.org_id where b.user_id = $1 and o.name = 'Swasthya Saathi'`, [SEED_IDS.testerVolunteer]);
    expect(before).toHaveLength(0);

    const t = three.find((x) => x.org_verified_at !== null)!;
    await act(() => bookAction({}, form({ slug: t.share_slug, occurrence_id: t.occurrence_id, source: "feed" })));
    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ booked_verified_ngo: true, task_booked: "Health camp helper · Swasthya Saathi" });
  });

  it("SH2: booking an unverified group's task fails the hypothesis", async () => {
    const { session } = await start("SH2", "T-V4");
    const t = await slugAndOcc(SEED_IDS.sh2Tasks[1]);
    await act(() => bookAction({}, form({ slug: t.share_slug, occurrence_id: t.id, source: "feed" })));
    expect((await finish(session)).suggested).toBe("Fail");
  });

  it("SH3: at T−30h the confirmation appears and the tester releases", async () => {
    const { session, startUrl } = await start("SH3", "T-V5");
    const token = startUrl.replace("/c/", "");
    const [b] = await query<{ status: string; start_at: Date }>(
      "select b.status, oc.start_at from bookings b join task_occurrences oc on oc.id = b.occurrence_id where b.confirm_token = $1", [token]);
    expect(b.status).toBe("awaiting_confirmation");
    expect(Math.round((b.start_at.getTime() - (await now()).getTime()) / 36e5)).toBe(30);
    const msgs = await query<{ type: string }>("select type from notifications where user_id = $1 order by due_at", [SEED_IDS.testerVolunteer]);
    expect(msgs.map((m) => m.type)).toEqual(["confirmation_request", "confirmation_reminder"]);

    await releaseAction(form({ token, reason: "travel" }));
    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ action: "release", release_type: "released_early", reason: "travel" });
  });

  it("SH3: ignoring the confirmation is a fail", async () => {
    const { session } = await start("SH3", "T-V6");
    const o = await finish(session);
    expect(o).toMatchObject({ suggested: "Fail", captured: { action: "ignore" } });
  });

  it("SH4: the lapsed volunteer opens the nudge and books", async () => {
    const { session, startUrl } = await start("SH4", "T-V7");
    expect(startUrl).toBe("/feed");
    const user = (await getUser())!;
    expect(Math.round(((await now()).getTime() - user.last_active_at.getTime()) / DAY_MS)).toBe(45);
    const nudge = await nudgeFor(user, await now());
    expect(nudge).not.toBeNull();
    expect(nudge!.text).toBe("It's been a while! 3 things near you match Teaching and Plantation.");
    // NGOs the volunteer attended before come first.
    expect(nudge!.tasks[0].org_name).toBe("Akshar Learning Circle");

    await trackAction("nudge_opened", { via: "task" });
    const t = nudge!.tasks[0];
    await act(() => bookAction({}, form({ slug: t.share_slug, occurrence_id: t.occurrence_id, source: "feed" })));
    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ nudge_opened: true, booked_from_nudge: true });
  });

  it("SH5: the coordinator decides on all five applicants", async () => {
    const { session, startUrl } = await start("SH5", "T-N1");
    expect(startUrl).toBe(`/ngo/tasks/${SEED_IDS.sh5Task}/applicants`);
    expect((await getUser())!.id).toBe(SEED_IDS.testerCoordinator);
    const requests = await query<{ id: string; user_id: string; name: string }>(
      `select b.id, b.user_id, u.name from bookings b join users u on u.id = b.user_id
       join task_occurrences oc on oc.id = b.occurrence_id where oc.task_id = $1 and b.status = 'requested' order by b.created_at desc`,
      [SEED_IDS.sh5Task]);
    expect(requests).toHaveLength(5);
    await trackAction("lab_profile_opened", { applicant_id: requests[0].user_id });
    for (const [i, r] of requests.entries()) {
      await decideAction(form({ task_id: SEED_IDS.sh5Task, booking_id: r.id, decision: i === 3 ? "decline" : "accept" }));
    }
    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ decided: 5, accepted: 4, declined: 1, profile_details_opened: 1 });
    // The accepted volunteers now hold seats and their phone can be shown.
    const seats = await query("select 1 from bookings b join task_occurrences oc on oc.id = b.occurrence_id where oc.task_id = $1 and b.status in ('booked','confirmed')", [SEED_IDS.sh5Task]);
    expect(seats).toHaveLength(4);
  });

  it("SH6: the coordinator publishes a task with the template", async () => {
    const { session, startUrl } = await start("SH6", "T-N2");
    expect(startUrl).toBe("/ngo/tasks/new");
    const date = istDateKey(new Date((await now()).getTime() + 5 * DAY_MS));
    const fields = {
      cause: "Food distribution", title: "Diwali sweet-box packing", role: "Packing volunteer",
      done_definition: "Three hundred sweet boxes packed, sealed and counted.",
      date, start_time: "10:00", end_time: "13:00", commitment: "one_off",
      mode: "onsite", city: "Bengaluru", address: "Unit 2, Sample Kitchen Lane", lat: "12.97", lng: "77.59",
      slots_needed: "10", min_trust: "verified", booking_mode: "instant",
      contact_name: "Lakshmi Rao", contact_role: "Volunteer coordinator", contact_phone: "9000000102",
      opened_at: String(Date.now() - 95_000), edited_fields: "cause,title,role,done_definition,date",
    };
    // A first attempt with a missing field is counted as a validation error.
    const bad = await publishTaskAction({}, form({ ...fields, title: "" }));
    expect(bad.errors).toHaveProperty("title");
    const to = await act(() => publishTaskAction({}, form(fields)));
    expect(to).toMatch(/^\/ngo\/tasks\/[0-9a-f-]{36}\?published=1&toast=posted$/);

    const o = await finish(session);
    expect(o.suggested).toBe("Pass");
    expect(o.captured).toMatchObject({ published: true, validation_errors: 1, fields_with_errors: ["title"] });
    expect(Number(o.captured!.seconds_to_publish)).toBeGreaterThanOrEqual(95);
    expect(Number(o.captured!.seconds_to_publish)).toBeLessThan(300);
    const [task] = await query<{ min_trust: string; status: string }>("select min_trust, status from tasks where title = 'Diwali sweet-box packing'");
    expect(task).toEqual({ min_trust: "verified", status: "published" });
  });

  it("SH7: the coordinator plans fewer sign-ups than today's practice", async () => {
    const { session, startUrl } = await start("SH7", "T-N3");
    expect(startUrl).toBe(`/ngo/tasks/${SEED_IDS.sh7Task}/turnout/${SEED_IDS.sh7Occurrence}`);
    const [t] = await query(
      "select needed, booked::int, confirmed::int, unconfirmed::int, released::int, filled_by_standby::int from v_turnout where occurrence_id = $1",
      [SEED_IDS.sh7Occurrence]);
    expect(t).toEqual({ needed: 15, booked: 13, confirmed: 10, unconfirmed: 3, released: 2, filled_by_standby: 1 });
    const offers = await query<{ status: string }>("select status from standby_offers where occurrence_id = $1", [SEED_IDS.sh7Occurrence]);
    expect(offers.map((o) => o.status).sort()).toEqual(["accepted", "sent", "sent", "taken", "taken"]);

    expect(await planningAnswerAction({}, form({ planned_signups: "17", needed: "15" }))).toEqual({ saved: 17 });
    const o = await finish(session);
    expect(o.captured).toMatchObject({ needed: 15, planned_signups: 17, extra_signups: 2 });
    expect(o.suggested).toBe("Partial"); // needs the facilitator's "current practice" number

    // Facilitator: "How many do you aim for today?" → 22, so 17 is fewer → Pass.
    await act(() => saveFormAction(form({ id: session.id, result: "Partial", follow_up: "22", quote: "I'd stop over-booking.", notes: "" })));
    const saved = (await getSession(session.id))!;
    expect(saved.outcome).toMatchObject({ result: "Pass", suggested: "Pass", answers: { aims_for_today: "22" } });
    expect(saved.quote).toBe("I'd stop over-booking.");
  });

  it("keeps every session across resets and exports them all as CSV", async () => {
    const sessions = await listSessions();
    expect(sessions.length).toBe(10);
    expect(sessions.every((s) => s.ended_at !== null && s.outcome.captured)).toBe(true);
    // Ending a session returns the prototype to real time.
    expect(Math.abs((await now()).getTime() - Date.now())).toBeLessThan(5000);
    expect(cookieJar.has("su_lab_session")).toBe(false);

    const res = await exportCsv();
    expect(res.headers.get("content-type")).toContain("text/csv");
    const lines = (await res.text()).trim().split("\r\n");
    expect(lines).toHaveLength(11);
    expect(lines[0]).toContain("scenario,tester_id,persona");
    expect(lines[0]).toContain("captured_seconds_to_booking");
    expect(lines.filter((l) => /^SH\d,T-[VN]\d,/.test(l))).toHaveLength(10);
    expect(lines.find((l) => l.startsWith("SH7,T-N3"))).toContain("I'd stop over-booking.");
    // capture() is repeatable from the stored event log.
    const sh3 = sessions.find((s) => s.tester_id === "T-V5")!;
    expect((await capture(sh3, sh3.ended_at!)).suggested).toBe("Pass");
  });
});
