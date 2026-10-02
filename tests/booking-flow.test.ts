import { describe, expect, it } from "vitest";
import {
  confirmBooking, createBooking, getBooking, occurrenceTurnout, releaseBooking,
} from "@/lib/data/bookings";
import { getOccurrence } from "@/lib/data/tasks";
import { query } from "@/lib/db";
import { runJobs } from "@/lib/jobs";
import { hours, makeOrg, makeTask, makeUser, messages, ORIGIN } from "./helpers";

const T0 = new Date("2026-11-01T06:00:00Z");
const book = (user: Awaited<ReturnType<typeof makeUser>>, occurrenceId: string, now: Date) =>
  createBooking({ user, occurrenceId, source: "link", now, origin: ORIGIN });

describe("confirm-and-release loop (F3, F4)", () => {
  it("books, asks at T−48h, reminds at T−36h and T−3h, never twice", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { occ } = await makeTask(org.id, start);
    const user = await makeUser();

    const res = await book(user, occ.id, T0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.booking.status).toBe("booked");
    const [confirmedMsg] = await messages("booking_confirmed");
    expect(confirmedMsg.payload.text).toMatch(/^You're in for Sapling drive with .* on \w{3}, \d+ \w{3} at \d+:\d\d [ap]m\. 🙌 We'll check in with you on \w{3}, \d+ \w{3}\. Plans change\? Free up your spot here: /);
    expect(confirmedMsg.payload.text).toContain(`${ORIGIN}/c/${res.booking.confirm_token}`);

    // Nothing is due before T−48h.
    expect((await runJobs(hours(-49, start), ORIGIN)).awaiting).toBe(0);

    // T−48h → awaiting_confirmation + one confirmation request.
    expect((await runJobs(hours(-48, start), ORIGIN)).awaiting).toBe(1);
    expect((await getBooking(res.booking.id))!.status).toBe("awaiting_confirmation");
    expect((await runJobs(hours(-47, start), ORIGIN)).awaiting).toBe(0);
    expect(await messages("confirmation_request")).toHaveLength(1);

    // T−36h → one reminder, idempotent.
    expect((await runJobs(hours(-36, start), ORIGIN)).reminders).toBe(1);
    expect((await runJobs(hours(-35, start), ORIGIN)).reminders).toBe(0);
    expect(await messages("confirmation_reminder")).toHaveLength(1);

    // T−24h: still active (no auto-cancel).
    await runJobs(hours(-20, start), ORIGIN);
    expect((await getBooking(res.booking.id))!.status).toBe("awaiting_confirmation");

    // T−3h → day-of reminder with place, contact and what done means.
    expect((await runJobs(hours(-3, start), ORIGIN)).dayOf).toBe(1);
    expect((await runJobs(hours(-2, start), ORIGIN)).dayOf).toBe(0);
    const [dayOf] = await messages("day_of_reminder");
    expect(dayOf.payload.text).toMatch(/^Today! Sapling drive at .*Hill Road Park.*Ask for Asha.*You're done when: Fifty saplings.*Thank you for showing up\. 💛$/);
  });

  it("stops asking once the volunteer confirms", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { occ } = await makeTask(org.id, start);
    const res = await book(await makeUser(), occ.id, T0);
    if (!res.ok) throw new Error("booking failed");
    await runJobs(hours(-48, start), ORIGIN);
    expect(await confirmBooking((await getBooking(res.booking.id))!, hours(-47, start))).toBe(true);
    const before = (await messages("confirmation_reminder")).length;
    await runJobs(hours(-30, start), ORIGIN);
    expect((await messages("confirmation_reminder")).length).toBe(before);
    expect((await getBooking(res.booking.id))!.status).toBe("confirmed");
  });

  it("treats a booking made inside 48h as already confirmed", async () => {
    const org = await makeOrg();
    const start = hours(30, T0);
    const { occ } = await makeTask(org.id, start);
    const res = await book(await makeUser(), occ.id, T0);
    expect(res.ok && res.booking.status).toBe("confirmed");
  });

  it("records early and late releases and reopens the seat at once", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { task, occ } = await makeTask(org.id, start, { slots_needed: 2 });
    const [a, b, c] = [await makeUser(), await makeUser(), await makeUser()];
    const ra = await book(a, occ.id, T0);
    const rb = await book(b, occ.id, T0);
    if (!ra.ok || !rb.ok) throw new Error("booking failed");

    // Full: a third volunteer is turned away.
    expect(await book(c, occ.id, T0)).toEqual({ ok: false, reason: "full" });
    // One booking per volunteer per occurrence.
    expect(await book(a, occ.id, T0)).toEqual({ ok: false, reason: "already_booked" });

    // Early release (before T−24h): no penalty, seat reopens.
    expect(await releaseBooking(ra.booking, "work", hours(-30, start))).toEqual({ ok: true, type: "released_early" });
    expect((await getOccurrence(occ.id))!.seats_taken).toBe(1);
    expect((await book(c, occ.id, hours(-29, start))).ok).toBe(true);

    // Late release (inside T−24h).
    expect(await releaseBooking(rb.booking, null, hours(-5, start))).toEqual({ ok: true, type: "released_late" });
    const released = await getBooking(rb.booking.id);
    expect(released).toMatchObject({ status: "released_late", release_reason: null });

    // Cannot release twice, or after the start.
    expect(await releaseBooking(released!, null, hours(-4, start))).toEqual({ ok: false });

    // Turnout counts equal the sum of booking statuses.
    const t = await occurrenceTurnout(occ.id, task.slots_needed);
    // (c booked inside 48h, so that booking is already confirmed.)
    expect(t).toMatchObject({ needed: 2, booked: 1, confirmed: 1, unconfirmed: 0, released: 2, gaps: 1 });
    expect(t.confirmed + t.unconfirmed).toBe(t.booked);

    // The NGO was told about each release.
    const alerts = await messages("ngo_release_alert");
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(alerts.some((a) => /^Volunteer can't make it to Sapling drive \(work came up\)\. \d of 2 coming\. We're on it\.$/.test(a.payload.text))).toBe(true);
    const receipts = await messages("release_receipt");
    expect(receipts.some((r) => r.payload.text.startsWith("All sorted, your spot is free for someone else."))).toBe(true);
  });

  it("refuses a booking once the slot has started", async () => {
    const org = await makeOrg();
    const start = hours(10, T0);
    const { occ } = await makeTask(org.id, start);
    expect(await book(await makeUser(), occ.id, hours(1, start))).toEqual({ ok: false, reason: "started" });
  });

  it("marks unmarked bookings not_recorded 72h after the start and prompts the NGO at slot end", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { occ } = await makeTask(org.id, start);
    const res = await book(await makeUser(), occ.id, T0);
    if (!res.ok) throw new Error("booking failed");

    const atEnd = await runJobs(hours(2.1, start), ORIGIN);
    // (Other tests in this file share the database, so earlier sessions end here too.)
    expect(atEnd.attendancePrompts).toBeGreaterThanOrEqual(1);
    expect((await runJobs(hours(3, start), ORIGIN)).attendancePrompts).toBe(0);
    expect((await getBooking(res.booking.id))!.status).not.toBe("not_recorded");

    expect((await runJobs(hours(73, start), ORIGIN)).notRecorded).toBeGreaterThanOrEqual(1);
    expect((await getBooking(res.booking.id))!.status).toBe("not_recorded");
    const stuck = await query("select 1 from bookings where status in ('booked','awaiting_confirmation') and id = $1", [res.booking.id]);
    expect(stuck).toHaveLength(0);
  });
});
