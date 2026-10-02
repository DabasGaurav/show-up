import { describe, expect, it } from "vitest";
import { ngoPill, volunteerPill } from "@/lib/labels";
import { MSG } from "@/lib/messages";
import { canMark, canSayYes, DAY_MS, freeType, HOUR_MS, morningOf, showUpRate, spotsLeft, statusOnSave, trackRecord, whoIsComing, type BookingStatus } from "@/lib/rules";

const start = new Date("2026-11-14T04:30:00Z"); // Sat 10:00 am IST
const before = (h: number) => new Date(start.getTime() - h * HOUR_MS);
const after = (h: number) => new Date(start.getTime() + h * HOUR_MS);

describe("freeing a spot (spec §3)", () => {
  it("is free at least 24 hours before, and 'freed late' after that", () => {
    expect(freeType(start, before(30))).toBe("released_early");
    expect(freeType(start, before(24))).toBe("released_early");
    expect(freeType(start, before(23.9))).toBe("released_late");
    expect(freeType(start, before(1))).toBe("released_late");
    expect(freeType(start, after(1))).toBeNull();
  });
});

describe("saying yes", () => {
  it("is offered from 2 days before", () => {
    expect(canSayYes("booked", start, before(49))).toBe(false);
    expect(canSayYes("booked", start, before(48))).toBe(true);
    expect(canSayYes("awaiting_confirmation", start, before(10))).toBe(true);
    expect(canSayYes("confirmed", start, before(10))).toBe(false);
    expect(canSayYes("booked", start, after(1))).toBe(false);
  });
  it("counts someone who joins in the last 2 days as confirmed", () => {
    expect(statusOnSave(start, before(72))).toBe("booked");
    expect(statusOnSave(start, before(40))).toBe("confirmed");
  });
});

describe("morning-of email", () => {
  it("goes at 7 am that day, or 2 hours before an early start", () => {
    expect(morningOf(start).toISOString()).toBe("2026-11-14T01:30:00.000Z"); // 7:00 am IST
    const early = new Date("2026-11-14T01:30:00Z"); // 7:00 am IST start
    expect(morningOf(early).toISOString()).toBe("2026-11-13T23:30:00.000Z"); // 5:00 am IST
  });
});

describe("mark who came", () => {
  it("is open from the start until 3 days after", () => {
    expect(canMark(start, before(1))).toBe(false);
    expect(canMark(start, start)).toBe(true);
    expect(canMark(start, new Date(start.getTime() + 3 * DAY_MS))).toBe(true);
    expect(canMark(start, new Date(start.getTime() + 3 * DAY_MS + 1))).toBe(false);
  });
});

describe("track record", () => {
  const f = (status: BookingStatus, d: number) => ({ status, startAt: new Date(Date.UTC(2026, 8, d)) });
  it("reads 'Came X of Y times', where Y leaves out spots freed early", () => {
    const r = trackRecord([...Array.from({ length: 7 }, (_, i) => f("attended", i + 1)), f("released_early", 9), f("confirmed", 28)]);
    expect(r.text).toBe("Came 7 of 7 times");
    expect(r.dots).toEqual(Array(7).fill("came"));
  });
  it("adds late frees and didn't-comes", () => {
    const r = trackRecord([f("attended", 1), f("released_late", 2), f("no_show", 3), f("attended", 4)]);
    expect(r.text).toBe("Came 2 of 4 times · freed 1 late · 1 didn't come");
    expect(r.dots).toEqual(["came", "freed", "missed", "came"]);
    expect(r).toMatchObject({ came: 2, total: 4, freedLate: 1, didntCome: 1 });
  });
  it("says so when there is no history, and shows at most 10 dots", () => {
    expect(trackRecord([f("released_early", 1)])).toMatchObject({ empty: true, text: "No history yet" });
    expect(trackRecord(Array.from({ length: 14 }, (_, i) => f("attended", i + 1))).dots).toHaveLength(10);
    expect(trackRecord([f("attended", 1)]).text).toBe("Came 1 of 1 time");
  });
});

describe("who's coming", () => {
  it("splits people into coming / not heard back / can't make it / still needed", () => {
    const statuses: BookingStatus[] = [...Array(8).fill("confirmed"), "booked", "awaiting_confirmation", "released_early", "released_late"];
    expect(whoIsComing(15, statuses)).toEqual({ needed: 15, coming: 8, notHeardBack: 2, cantMakeIt: 2, stillNeeded: 5 });
    expect(spotsLeft(15, statuses)).toBe(5);
    expect(spotsLeft(2, ["confirmed", "attended", "booked"])).toBe(0);
  });
});

describe("the admin number", () => {
  it("is (came + freed early) ÷ all spots with a known ending", () => {
    const r = showUpRate([...Array(28).fill("attended"), ...Array(5).fill("released_early"), ...Array(3).fill("released_late"), ...Array(4).fill("no_show"), "confirmed", "booked"]);
    expect(r).toMatchObject({ spots: 40, came: 28, freedEarly: 5, freedLate: 3, didntCome: 4, rate: 82.5 });
    expect(showUpRate([]).rate).toBeNull();
  });
});

describe("words people see", () => {
  const BANNED = /\bslots?\b|releas|reliability|micro-volunteering|platform|pilot|\bdemo\b|48 hours|24 hours/i;
  it("uses the statuses from the spec", () => {
    expect((["booked", "awaiting_confirmation", "confirmed", "released_early", "attended", "no_show"] as const).map((s) => volunteerPill(s).label))
      .toEqual(["Saved", "Waiting for your yes", "Confirmed", "Freed", "Came", "Didn't come"]);
    expect((["confirmed", "booked", "released_late"] as const).map((s) => ngoPill(s).label)).toEqual(["Coming", "Not heard back", "Can't make it"]);
  });
  it("sends the emails in §4, word for word", () => {
    const m = { title: "Pack 200 ration kits", ngo: "Annadaan", day: "Sunday", time: "10:00 am" };
    const all = [
      MSG.spotSaved({ ...m, checkInDay: "Fri, 2 Oct", link: "L" }),
      MSG.stillOn({ ...m, link: "L" }),
      MSG.noReply({ ...m, link: "L" }),
      MSG.morningOf({ ...m, placeOrLink: "Community hall", contact: "Rekha", done: "All 200 kits are packed" }),
      MSG.freedToVolunteer(m),
      MSG.freedToNgo({ name: "Priya", title: m.title, reason: "work came up", coming: 8, needed: 15 }),
      MSG.afterTheDay({ title: m.title, link: "L" }),
      MSG.comeBack({ list: "• A\n• B\n• C" }),
    ];
    expect(all).toEqual([
      "You're in for Pack 200 ration kits with Annadaan on Sunday at 10:00 am. We'll check in on Fri, 2 Oct. Plans change? Free your spot: L",
      "Still on for Pack 200 ration kits this Sunday at 10:00 am? One tap lets Annadaan plan: L",
      "Quick one: coming to Pack 200 ration kits on Sunday? L",
      "Today! Pack 200 ration kits at 10:00 am, Community hall. Ask for Rekha. You're done when: All 200 kits are packed. Thanks for showing up 💛",
      "All sorted, your spot is free for someone else. Thanks for telling Annadaan.",
      "Priya can't make it to Pack 200 ration kits (work came up). 8 of 15 coming.",
      "How did Pack 200 ration kits go? Mark who came, it takes 30 seconds: L",
      "Free this weekend? 3 things near you:\n• A\n• B\n• C",
    ]);
    for (const t of all) expect(t).not.toMatch(BANNED);
  });
});
