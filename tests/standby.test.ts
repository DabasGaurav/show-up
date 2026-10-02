import { describe, expect, it } from "vitest";
import { createBooking, decideRequest, getBooking, markAttendance, occurrenceTurnout, releaseBooking } from "@/lib/data/bookings";
import { nudgeFor, snoozeNudge, markMoved } from "@/lib/data/nudges";
import { orgProfile } from "@/lib/data/org-profile";
import { acceptOffer, getOffer, listOffersForOccurrence, listOffersForUser, offerToStandby, setStandby } from "@/lib/data/standby";
import { query } from "@/lib/db";
import { istDateKey } from "@/lib/format";
import { runJobs } from "@/lib/jobs";
import { hours, makeOrg, makeTask, makeUser, messages, ORIGIN } from "./helpers";

const T0 = new Date("2027-01-10T06:00:00Z");

/** A Trusted volunteer: ID approved and 3 attended slots in the last 90 days. */
async function makeTrusted(orgId: string) {
  const u = await makeUser({ id_status: "approved" });
  for (let i = 1; i <= 3; i++) {
    const { occ } = await makeTask(orgId, hours(-24 * 10 * i, T0), { slots_needed: 5 });
    const r = await createBooking({ user: u, occurrenceId: occ.id, source: "link", now: hours(-24 * 10 * i - 100, T0), origin: ORIGIN });
    if (!r.ok) throw new Error("history booking failed");
    await markAttendance(occ.id, { [r.booking.id]: "attended" });
  }
  return u;
}

describe("standby cover (F11)", () => {
  it("offers a released seat to matching standby volunteers, Trusted first; first to accept gets it", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { task, occ } = await makeTask(org.id, start, { slots_needed: 1, min_trust: "verified" });
    const date = istDateKey(start);

    const trusted = await makeTrusted(org.id);
    const verified = await makeUser({ id_status: "approved" });
    const fresh = await makeUser(); // New: below the task's minimum trust level
    const elsewhere = await makeUser({ id_status: "approved" });
    for (const u of [verified, trusted, fresh]) await setStandby(u.id, { date, city: "Pune", isOnline: false, causes: [] });
    await setStandby(elsewhere.id, { date, city: "Mumbai", isOnline: false, causes: [] });

    const booker = await makeUser({ id_status: "approved" });
    const b = await createBooking({ user: booker, occurrenceId: occ.id, source: "link", now: T0, origin: ORIGIN });
    if (!b.ok) throw new Error("booking failed");
    const at = hours(-30, start);
    expect((await releaseBooking(b.booking, "work", at)).ok).toBe(true);
    expect(await offerToStandby((await getBooking(b.booking.id))!, at, ORIGIN)).toBe(2);

    const offers = await listOffersForOccurrence(occ.id);
    expect(offers.map((o) => o.user_id)).toEqual([trusted.id, verified.id]); // Trusted first
    expect(offers.every((o) => o.expires_at.getTime() === hours(2, at).getTime())).toBe(true);
    expect((await messages("standby_offer")).at(-1)!.payload.text).toMatch(/^A spot just opened! Sapling drive, .* First to say yes gets it: /);

    // Offering again does not duplicate.
    expect(await offerToStandby((await getBooking(b.booking.id))!, at, ORIGIN)).toBe(0);

    // The Verified volunteer taps first and gets the seat.
    const mine = (await getOffer(offers[1].id))!;
    const res = await acceptOffer(mine, verified, hours(0.5, at), ORIGIN);
    expect(res.ok).toBe(true);
    const t = await occurrenceTurnout(occ.id, task.slots_needed);
    expect(t).toMatchObject({ booked: 1, filledByStandby: 1, released: 1, gaps: 0 });

    // The other volunteer sees "This slot has been taken".
    const other = (await getOffer(offers[0].id))!;
    expect(other.status).toBe("taken");
    expect(await acceptOffer(other, trusted, hours(1, at), ORIGIN)).toEqual({ ok: false, reason: "taken" });
    expect((await listOffersForUser(trusted.id, hours(1, at))).map((o) => o.status)).toEqual(["taken"]);
  });

  it("expires an offer after 2 hours", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { occ } = await makeTask(org.id, start, { slots_needed: 1 });
    const standby = await makeUser();
    await setStandby(standby.id, { date: istDateKey(start), city: "Pune", isOnline: false, causes: ["Plantation"] });
    const b = await createBooking({ user: await makeUser(), occurrenceId: occ.id, source: "link", now: T0, origin: ORIGIN });
    if (!b.ok) throw new Error("booking failed");
    const at = hours(-40, start);
    await releaseBooking(b.booking, null, at);
    await offerToStandby((await getBooking(b.booking.id))!, at, ORIGIN);
    const [offer] = await listOffersForOccurrence(occ.id);
    expect(await acceptOffer((await getOffer(offer.id))!, standby, hours(2.5, at), ORIGIN)).toEqual({ ok: false, reason: "expired" });
    await runJobs(hours(3, at), ORIGIN);
    expect((await getOffer(offer.id))!.status).toBe("expired");
  });
});

describe("guaranteed response (F15)", () => {
  it("auto-releases an unanswered request after 48h and counts it against the response rate", async () => {
    const org = await makeOrg();
    const start = hours(400, T0);
    const { occ } = await makeTask(org.id, start, { booking_mode: "approval", slots_needed: 3 });
    const [a, b, c] = [await makeUser(), await makeUser(), await makeUser()];
    const book = (u: typeof a) => createBooking({ user: u, occurrenceId: occ.id, source: "feed", now: T0, origin: ORIGIN });
    const [ra, rb, rc] = [await book(a), await book(b), await book(c)];
    if (!ra.ok || !rb.ok || !rc.ok) throw new Error("request failed");
    expect(ra.booking.status).toBe("requested");
    expect((await occurrenceTurnout(occ.id, 3)).booked).toBe(0); // a request holds no seat

    expect(await decideRequest(ra.booking, true, hours(5, T0), ORIGIN)).toEqual({ ok: true });
    expect((await getBooking(ra.booking.id))!.status).toBe("booked");
    expect(await decideRequest(rb.booking, false, hours(6, T0), ORIGIN)).toEqual({ ok: true });
    expect((await getBooking(rb.booking.id))!.status).toBe("declined");

    await runJobs(hours(47, T0), ORIGIN);
    expect((await getBooking(rc.booking.id))!.status).toBe("requested");
    const report = await runJobs(hours(49, T0), ORIGIN);
    expect(report.extra.autoReleased).toBeGreaterThanOrEqual(1);
    expect((await getBooking(rc.booking.id))!.status).toBe("auto_released");
    expect((await messages("request_auto_released")).at(-1)!.payload.text).toContain("hasn't replied about Sapling drive");

    // 2 of 3 answered within 48 hours.
    expect((await orgProfile(org.id, hours(50, T0)))!.responseRate).toBe(67);
  });
});

describe("re-engagement nudges (F12)", () => {
  it("nudges a lapsed volunteer with matching tasks, and again after a move", async () => {
    const org = await makeOrg();
    await query("update organisations set city = 'Pune' where id = $1", [org.id]);
    await makeTask(org.id, hours(200, T0), { cause: "Plantation", title: "Lakeside planting" });
    await makeTask(org.id, hours(220, T0), { cause: "Teaching", title: "Reading hour" });

    const recent = { ...(await makeUser({ city: "Pune", saved_causes: ["Plantation"] })), created_at: hours(-24, T0) };
    expect(await nudgeFor(recent, T0)).toBeNull(); // joined yesterday: not lapsed

    const lapsed = await makeUser({ city: "Pune", saved_causes: ["Plantation"] });
    await query("update users set created_at = $2 where id = $1", [lapsed.id, hours(-24 * 45, T0)]);
    const user = { ...lapsed, created_at: hours(-24 * 45, T0) };
    const nudge = await nudgeFor(user, T0);
    expect(nudge).not.toBeNull();
    expect(nudge!.reason).toBe("lapsed");
    expect(nudge!.tasks.length).toBeLessThanOrEqual(3);
    expect(nudge!.tasks.every((t) => t.cause === "Plantation")).toBe(true);
    expect(nudge!.text).toMatch(/^It's been a while! \d things? near you match(es)? Plantation\.$/);

    await snoozeNudge(user.id, T0, 7);
    expect(await nudgeFor(user, hours(24, T0))).toBeNull();

    // Updating the city triggers a fresh nudge.
    await markMoved(recent.id, T0);
    expect((await nudgeFor(recent, T0))!.reason).toBe("moved");
  });
});
