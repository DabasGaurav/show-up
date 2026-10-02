import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  HOUR_MS,
  canBook,
  canMarkAttendance,
  displayRating,
  initialBookingStatus,
  isLapsed,
  isUnconfirmed,
  keptStreak,
  meetsMinTrust,
  mvpMetrics,
  nudgeTasks,
  offerExpiry,
  pausedUntil,
  progressToTrusted,
  releaseType,
  reliabilityRecord,
  reliabilityString,
  remindersFor,
  responseRate,
  shouldAutoRelease,
  shouldAwaitConfirmation,
  shouldMarkNotRecorded,
  standbyQueue,
  statusChip,
  trustLevel,
  turnout,
  verifiedHours,
  type BookingFact,
  type BookingStatus,
} from "@/lib/rules";

const start = new Date("2026-11-14T04:30:00Z"); // Sat 10:00 IST
const before = (hours: number) => new Date(start.getTime() - hours * HOUR_MS);
const after = (hours: number) => new Date(start.getTime() + hours * HOUR_MS);
const now = new Date("2026-11-01T00:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY_MS);
const fact = (status: BookingStatus, days: number, durationMin = 120): BookingFact => ({
  status,
  startAt: daysAgo(days),
  durationMin,
});

describe("release windows (§5.3)", () => {
  it("is early before T−24h and late from T−24h to start", () => {
    expect(releaseType(start, before(30))).toBe("released_early");
    expect(releaseType(start, before(24.01))).toBe("released_early");
    expect(releaseType(start, before(24))).toBe("released_late");
    expect(releaseType(start, before(1))).toBe("released_late");
  });
  it("cannot release once the slot has started", () => {
    expect(releaseType(start, start)).toBeNull();
    expect(releaseType(start, after(1))).toBeNull();
  });
  it("treats a booking made inside 48h as already confirmed", () => {
    expect(initialBookingStatus(start, before(72))).toBe("booked");
    expect(initialBookingStatus(start, before(47))).toBe("confirmed");
  });
  it("moves booked → awaiting_confirmation at T−48h", () => {
    expect(shouldAwaitConfirmation("booked", start, before(49))).toBe(false);
    expect(shouldAwaitConfirmation("booked", start, before(48))).toBe(true);
    expect(shouldAwaitConfirmation("confirmed", start, before(40))).toBe(false);
    expect(shouldAwaitConfirmation("booked", start, after(1))).toBe(false);
  });
  it("shows Unconfirmed from T−24h without cancelling", () => {
    expect(isUnconfirmed("awaiting_confirmation", start, before(30))).toBe(false);
    expect(isUnconfirmed("awaiting_confirmation", start, before(24))).toBe(true);
    expect(isUnconfirmed("confirmed", start, before(2))).toBe(false);
  });
  it("schedules T−48h, T−36h and T−3h messages from the start time", () => {
    const r = remindersFor("booked", start, before(100));
    expect(r.map((x) => x.type)).toEqual(["confirmation_request", "confirmation_reminder", "day_of_reminder"]);
    expect(r.map((x) => x.dueAt)).toEqual([before(48), before(36), before(3)]);
  });
  it("sends only the day-of reminder once confirmed or booked late", () => {
    expect(remindersFor("confirmed", start, before(100)).map((x) => x.type)).toEqual(["day_of_reminder"]);
    expect(remindersFor("confirmed", start, before(20)).map((x) => x.type)).toEqual(["day_of_reminder"]);
    expect(remindersFor("released_early", start, before(100))).toEqual([]);
  });
});

describe("attendance (§5.4)", () => {
  it("can be marked from start until 72h after", () => {
    expect(canMarkAttendance(start, before(1))).toBe(false);
    expect(canMarkAttendance(start, start)).toBe(true);
    expect(canMarkAttendance(start, after(72))).toBe(true);
    expect(canMarkAttendance(start, after(73))).toBe(false);
  });
  it("marks unmarked bookings not_recorded after 72h", () => {
    expect(shouldMarkNotRecorded("confirmed", start, after(71))).toBe(false);
    expect(shouldMarkNotRecorded("confirmed", start, after(73))).toBe(true);
    expect(shouldMarkNotRecorded("attended", start, after(73))).toBe(false);
  });
});

describe("reliability record (§5.5)", () => {
  it("excludes early releases from booked", () => {
    const r = reliabilityRecord([
      ...Array.from({ length: 7 }, (_, i) => fact("attended", i + 1)),
      fact("released_late", 10),
      fact("released_early", 11),
      fact("not_recorded", 12),
      fact("confirmed", -3),
    ]);
    expect(r).toEqual({ attended: 7, booked: 8, lateReleases: 1, noShows: 0 });
    expect(reliabilityString(r)).toBe("Attended 7 of 8 booked slots · 1 late release · 0 no-shows");
  });
  it("shows 'No slots yet' for a new volunteer", () => {
    expect(reliabilityString(reliabilityRecord([]))).toBe("No slots yet");
  });
  it("counts the kept-commitment streak and verified hours", () => {
    const b = [fact("attended", 1), fact("released_early", 2), fact("attended", 3), fact("no_show", 4), fact("attended", 5)];
    expect(keptStreak(b)).toBe(3);
    expect(verifiedHours(b)).toBe(6);
    expect(verifiedHours([fact("attended", 1, 90)])).toBe(1.5);
  });
});

describe("trust levels (§5.1)", () => {
  const three = [fact("attended", 5), fact("attended", 12), fact("attended", 20)];
  it("New until ID is approved", () => {
    expect(trustLevel("none", three, now)).toBe("new");
    expect(trustLevel("pending", three, now)).toBe("new");
  });
  it("Verified with ID, Trusted with 3 attended and no no-shows in 90 days", () => {
    expect(trustLevel("approved", three.slice(0, 2), now)).toBe("verified");
    expect(trustLevel("approved", three, now)).toBe("trusted");
    expect(trustLevel("approved", [fact("attended", 5), fact("attended", 100), fact("attended", 120)], now)).toBe("verified");
  });
  it("a no-show removes Trusted until 3 further attended slots", () => {
    expect(trustLevel("approved", [...three, fact("no_show", 2)], now)).toBe("verified");
    const regained = [fact("no_show", 40), fact("attended", 30), fact("attended", 20), fact("attended", 10)];
    expect(trustLevel("approved", regained, now)).toBe("trusted");
    expect(progressToTrusted(regained.slice(0, 3), now)).toEqual({ attended: 2, needed: 3 });
  });
  it("orders levels against a task's minimum", () => {
    expect(meetsMinTrust("new", "everyone")).toBe(true);
    expect(meetsMinTrust("new", "verified")).toBe(false);
    expect(meetsMinTrust("verified", "trusted")).toBe(false);
    expect(meetsMinTrust("trusted", "verified")).toBe(true);
  });
});

describe("no-show consequences (§5.6)", () => {
  it("pauses for 30 days after 2 no-shows within 90 days", () => {
    expect(pausedUntil([fact("no_show", 50), fact("no_show", 10)], now)).toEqual(new Date(daysAgo(10).getTime() + 30 * DAY_MS));
  });
  it("does not pause for one no-show, or two far apart, or after 30 days", () => {
    expect(pausedUntil([fact("no_show", 10)], now)).toBeNull();
    expect(pausedUntil([fact("no_show", 150), fact("no_show", 10)], now)).toBeNull();
    expect(pausedUntil([fact("no_show", 80), fact("no_show", 40)], now)).toBeNull();
  });
  it("blocks only Verified-only and Trusted-only tasks, and only when enforced", () => {
    const base = { seatsLeft: 2, level: "verified" as const, alreadyBooked: false, startAt: start, now, pausedUntil: new Date(now.getTime() + DAY_MS) };
    expect(canBook({ ...base, minTrust: "everyone", enforceTrust: true })).toEqual({ ok: true });
    expect(canBook({ ...base, minTrust: "verified", enforceTrust: true })).toEqual({ ok: false, reason: "paused" });
    expect(canBook({ ...base, minTrust: "verified", enforceTrust: false })).toEqual({ ok: true });
  });
});

describe("booking gate (§5.2)", () => {
  const base = { seatsLeft: 1, minTrust: "everyone" as const, level: "new" as const, pausedUntil: null, alreadyBooked: false, startAt: start, now, enforceTrust: true };
  it("needs a free seat, one booking per occurrence, and a future slot", () => {
    expect(canBook(base)).toEqual({ ok: true });
    expect(canBook({ ...base, seatsLeft: 0 })).toEqual({ ok: false, reason: "full" });
    expect(canBook({ ...base, alreadyBooked: true })).toEqual({ ok: false, reason: "already_booked" });
    expect(canBook({ ...base, now: after(1) })).toEqual({ ok: false, reason: "started" });
  });
  it("needs the task's minimum trust level", () => {
    expect(canBook({ ...base, minTrust: "trusted" })).toEqual({ ok: false, reason: "trust_level" });
    expect(canBook({ ...base, minTrust: "trusted", level: "trusted" })).toEqual({ ok: true });
  });
});

describe("standby cover (§5.7)", () => {
  const seat = { mode: "onsite" as const, city: "Delhi NCR", cause: "Teaching", minTrust: "verified" as const };
  const c = (userId: string, o: Partial<Parameters<typeof standbyQueue>[1][number]> = {}) => ({
    userId, level: "verified" as const, city: "Delhi NCR", isOnline: false, causes: ["Teaching"], busy: false, ...o,
  });
  it("matches city, cause, trust level and availability; Trusted first", () => {
    const q = standbyQueue(seat, [
      c("verified"),
      c("trusted", { level: "trusted" }),
      c("new", { level: "new" }),
      c("pune", { city: "Pune" }),
      c("busy", { busy: true }),
      c("other-cause", { causes: ["Plantation"] }),
    ]);
    expect(q.map((x) => x.userId)).toEqual(["trusted", "verified"]);
  });
  it("offers online seats to online standby volunteers in any city", () => {
    const q = standbyQueue({ ...seat, mode: "online", minTrust: "everyone" }, [
      c("online", { city: "Pune", isOnline: true }),
      c("offline", { isOnline: false }),
    ]);
    expect(q.map((x) => x.userId)).toEqual(["online"]);
  });
  it("offers last 2 hours or until the task starts", () => {
    expect(offerExpiry(before(10), start)).toEqual(before(8));
    expect(offerExpiry(before(1), start)).toEqual(start);
  });
});

describe("guaranteed response (§5.8)", () => {
  const req = (createdDaysAgo: number, decidedAfterHours: number | null) => {
    const createdAt = daysAgo(createdDaysAgo);
    return { createdAt, decidedAt: decidedAfterHours === null ? null : new Date(createdAt.getTime() + decidedAfterHours * HOUR_MS) };
  };
  it("auto-releases an unanswered request after 48h", () => {
    expect(shouldAutoRelease(req(1, null), now)).toBe(false);
    expect(shouldAutoRelease(req(3, null), now)).toBe(true);
    expect(shouldAutoRelease(req(3, 10), now)).toBe(false);
  });
  it("is the % answered within 48h over the last 90 days", () => {
    expect(responseRate([req(10, 5), req(12, 40), req(15, 60), req(20, null), req(1, null), req(200, null)], now)).toBe(50);
    expect(responseRate([], now)).toBeNull();
  });
});

describe("re-engagement nudges (§5.9)", () => {
  it("is lapsed after 30 days without a booking", () => {
    expect(isLapsed(daysAgo(29), now)).toBe(false);
    expect(isLapsed(daysAgo(30), now)).toBe(true);
    expect(isLapsed(null, now)).toBe(true);
  });
  it("suggests up to 3 matching tasks, familiar NGOs first", () => {
    const t = (id: string, o: object = {}) => ({ id, orgId: "o1", cause: "Teaching", mode: "onsite" as const, city: "Delhi NCR", startAt: new Date(now.getTime() + DAY_MS), ...o });
    const out = nudgeTasks(
      [
        t("a"),
        t("past", { startAt: daysAgo(1) }),
        t("pune", { city: "Pune" }),
        t("online", { mode: "online", city: "Online", startAt: new Date(now.getTime() + 2 * DAY_MS) }),
        t("familiar", { orgId: "o2", startAt: new Date(now.getTime() + 5 * DAY_MS) }),
        t("other", { cause: "Food distribution" }),
        t("late", { startAt: new Date(now.getTime() + 9 * DAY_MS) }),
      ],
      { city: "Delhi NCR", savedCauses: ["Teaching", "Plantation"], attendedOrgIds: ["o2"] },
      now,
    );
    expect(out.map((x) => x.id)).toEqual(["familiar", "a", "online"]);
  });
});

describe("ratings (§5.10)", () => {
  it("shows the average only after 3 reviews", () => {
    expect(displayRating([5, 4])).toBeNull();
    expect(displayRating([5, 4, 5])).toEqual({ average: 4.7, count: 3 });
  });
});

describe("turnout view (F7)", () => {
  const b = (status: BookingStatus, source = "link") => ({ status, source });
  it("counts always equal the sum of booking statuses", () => {
    const t = turnout(15, [
      ...Array(8).fill(b("confirmed")),
      b("confirmed", "standby"),
      b("booked"),
      b("awaiting_confirmation"),
      b("released_early"),
      b("released_late"),
      b("declined"),
    ]);
    expect(t).toMatchObject({ needed: 15, booked: 11, confirmed: 9, unconfirmed: 2, released: 2, filledByStandby: 1, gaps: 4, seatsLeft: 4 });
    expect(t.confirmed + t.unconfirmed).toBe(t.booked);
  });
  it("labels every status in text, amber when unconfirmed inside 24h", () => {
    expect(statusChip("awaiting_confirmation", start, before(30))).toEqual({ label: "Awaiting confirmation", tone: "amber" });
    expect(statusChip("booked", start, before(10))).toEqual({ label: "Unconfirmed", tone: "amber" });
    expect(statusChip("confirmed", start, before(10))).toEqual({ label: "Confirmed", tone: "green" });
    expect(statusChip("no_show", start, after(5))).toEqual({ label: "No-show", tone: "red" });
  });
});

describe("MVP1 primary metric (§10.1)", () => {
  it("is (attended + released_early) ÷ bookings, excluding not_recorded", () => {
    const m = mvpMetrics([
      ...Array(28).fill({ status: "attended" }),
      ...Array(5).fill({ status: "released_early" }),
      ...Array(3).fill({ status: "released_late" }),
      ...Array(4).fill({ status: "no_show" }),
      ...Array(2).fill({ status: "not_recorded" }),
    ]);
    expect(m.total).toBe(40);
    expect(m.showUpOrEarlyReleaseRate).toBe(82.5);
    expect(m.noShowRate).toBe(10);
    expect(m.lateReleaseRate).toBe(7.5);
  });
  it("is null with no past bookings", () => {
    expect(mvpMetrics([]).showUpOrEarlyReleaseRate).toBeNull();
  });
});
