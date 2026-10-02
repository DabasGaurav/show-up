import { describe, expect, it } from "vitest";
import data from "@/lib/demo/data.json";
import { demoActivities, demoApplicants, demoNgos } from "@/lib/demo";
import { fmtDayTime, fmtTime, fmtTimeShort } from "@/lib/format";
import { ngoPill, trackRecord, volunteerPill } from "@/lib/labels";
import { MESSAGE_LABEL, MSG } from "@/lib/messages";
import type { BookingFact, BookingStatus } from "@/lib/rules";

// Words the redesign brief (B1) says people should never see.
const AVOID = /(reliability|\breleas\w*|\bslots?\b|\bbookings?\b|\bbooked\b|\btasks?\b|48[- ]hour|no-show|turnout|verif\w+|micro-volunteering|\bplatform\b|\bpilot\b|\bMVP\b)/i;

const day = (d: number) => new Date(Date.UTC(2026, 8, d, 4));
const fact = (status: BookingStatus, d: number): BookingFact => ({ status, startAt: day(d) });

describe("track record (brief A4.3)", () => {
  it("reads 'Came 7 of 7 times' with one dot per activity", () => {
    const r = trackRecord(Array.from({ length: 7 }, (_, i) => fact("attended", i + 1)));
    expect(r.text).toBe("Came 7 of 7 times");
    expect(r.dots).toEqual(Array(7).fill("came"));
  });
  it("mentions late frees and misses, and ignores spots freed in good time", () => {
    const r = trackRecord([fact("attended", 1), fact("released_early", 2), fact("released_late", 3), fact("no_show", 4), fact("attended", 5)]);
    expect(r.text).toBe("Came 2 of 4 times · freed 1 late · 1 didn't come");
    expect(r.dots).toEqual(["came", "freed", "freed", "missed", "came"]);
  });
  it("shows at most 10 dots and says so when there is no history", () => {
    expect(trackRecord(Array.from({ length: 14 }, (_, i) => fact("attended", i + 1))).dots).toHaveLength(10);
    expect(trackRecord([fact("confirmed", 20)])).toMatchObject({ empty: true, text: "No history yet" });
    expect(trackRecord([fact("attended", 1)]).text).toBe("Came 1 of 1 time");
  });
});

describe("status wording (brief B6, B10)", () => {
  const start = new Date("2026-11-14T04:30:00Z");
  const hoursBefore = (h: number) => new Date(start.getTime() - h * 36e5);
  it("uses the volunteer pills from the brief", () => {
    expect((["booked", "confirmed", "awaiting_confirmation", "released_early", "attended", "no_show"] as const).map((s) => volunteerPill(s).label))
      .toEqual(["Saved", "Confirmed", "Waiting for your yes", "Freed", "Came", "Didn't come"]);
  });
  it("tells the NGO Coming / Not heard back / Freed their spot", () => {
    expect(ngoPill("confirmed", start, hoursBefore(30)).label).toBe("Coming");
    expect(ngoPill("awaiting_confirmation", start, hoursBefore(40)).label).toBe("Not heard back");
    expect(ngoPill("booked", start, hoursBefore(90)).label).toBe("Saved a spot");
    expect(ngoPill("booked", start, hoursBefore(10)).label).toBe("Not heard back");
    expect(ngoPill("released_late", start, hoursBefore(5)).label).toBe("Freed their spot");
  });
});

describe("real days and times, never rules (brief B1)", () => {
  it("formats deadlines like 'Fri, 9 am'", () => {
    expect(fmtDayTime(new Date("2026-10-09T03:30:00Z"))).toBe("Fri, 9 am");
    expect(fmtTime(new Date("2026-10-10T03:30:00Z"))).toBe("9:00 am");
    expect(fmtTimeShort(new Date("2026-10-10T04:00:00Z"))).toBe("9:30 am");
  });
});

describe("messages (brief B11)", () => {
  const m = { task: "Pack 200 ration kits", ngo: "Annadaan Noida Circle", date: "Sun, 4 Oct", time: "10:00 am", day: "Sunday" };
  const all = [
    MSG.bookingConfirmed({ ...m, checkIn: "Fri, 2 Oct", link: "L" }),
    MSG.bookingConfirmed({ ...m, checkIn: null, link: "L" }),
    MSG.confirmationRequest({ ...m, firstName: "Rohan", link: "L" }),
    MSG.confirmationReminder({ ...m, link: "L" }),
    MSG.dayOfReminder({ ...m, placeOrLink: "Community hall", contact: "Rekha", done: "All 200 kits packed and stacked" }),
    MSG.releaseReceipt(m),
    MSG.ngoReleaseAlert({ name: "Priya", task: m.task, reason: "work came up", coming: 8, needed: 15 }),
    MSG.ngoAttendancePrompt({ task: m.task, link: "L" }),
    MSG.bookingRequested(m), MSG.requestAccepted({ ...m, freeBy: "Sat, 10 am", link: "L" }), MSG.requestDeclined(m),
    MSG.requestAutoReleased({ ...m, link: "L" }), MSG.standbyOffer({ ...m, link: "L" }), MSG.nudge({ n: 3, causes: "Food and Teaching" }),
    MSG.ngoNewRequest({ name: "Priya", task: m.task, date: m.date, link: "L" }),
  ];
  it("match the brief word for word", () => {
    expect(all[0]).toBe("You're in for Pack 200 ration kits with Annadaan Noida Circle on Sun, 4 Oct at 10:00 am. 🙌 We'll check in with you on Fri, 2 Oct. Plans change? Free up your spot here: L");
    expect(all[2]).toBe("Hi Rohan, still on for Pack 200 ration kits this Sunday at 10:00 am? Tap to let Annadaan Noida Circle know: L");
    expect(all[3]).toBe("Quick one: are you coming to Pack 200 ration kits on Sunday? One tap helps Annadaan Noida Circle plan: L");
    expect(all[4]).toBe("Today! Pack 200 ration kits at 10:00 am, Community hall. Ask for Rekha. You're done when: All 200 kits packed and stacked. Thank you for showing up. 💛");
    expect(all[5]).toBe("All sorted, your spot is free for someone else. Thanks for letting Annadaan Noida Circle know.");
    expect(all[6]).toBe("Priya can't make it to Pack 200 ration kits (work came up). 8 of 15 coming. We're on it.");
    expect(all[7]).toBe("How did Pack 200 ration kits go? Mark who came, it takes 30 seconds: L");
  });
  it("never use the words to avoid", () => {
    for (const text of [...all, ...Object.values(MESSAGE_LABEL)]) expect(text, text).not.toMatch(AVOID);
  });
});

describe("demo data (brief Part E)", () => {
  it("has the eight research-based NGOs, with only Hunar Haath unchecked among them", () => {
    const real = demoNgos.filter((n) => !n.notFromResearch);
    expect(real.map((n) => n.name)).toEqual([
      "Gyaan Ghar Foundation", "Prerna Shiksha Sangathan", "Mamta Shishu Ashray", "Saath Sikhein Collective",
      "Hunar Haath Collective", "Ghar Ki Didi Trust", "Hands Together Seva", "Annadaan Noida Circle",
    ]);
    expect(real.filter((n) => !n.checked).map((n) => n.name)).toEqual(["Hunar Haath Collective"]);
  });
  it("has the twelve activities, all in the future, and three similar ones for SH2", () => {
    const now = new Date("2026-10-07T06:00:00Z");
    const all = demoActivities(now);
    expect(all.filter((a) => !a.onlyInPick)).toHaveLength(12);
    expect(all.every((a) => a.startAt.getTime() > now.getTime() && a.left <= a.needed)).toBe(true);
    const pick = all.filter((a) => a.similar);
    expect(pick.map((a) => a.org.checked).sort()).toEqual([false, false, true]);
    expect(all.find((a) => a.slug === "ration-kits")).toMatchObject({ needed: 15, left: 6 });
  });
  it("has the five SH5 applicants exactly as specified", () => {
    expect(demoApplicants.map((a) => [a.name, a.level, a.came, a.of])).toEqual([
      ["Divya M.", "trusted", 9, 9], ["Sana K.", "verified", 3, 4], ["Kabir T.", "new", 0, 0], ["Arnav P.", "verified", 5, 7], ["Meera J.", "trusted", 12, 12],
    ]);
    expect(demoApplicants[3].paused).toBe("Paused from Checked-only activities until 12 Nov");
    expect(demoApplicants[4].note).toBe("Would invite again ×5");
  });
  it("never shows where a record came from, and avoids the banned words", () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/based on|GD-|SJ-|AG-|SC-|BH-|GK-|Persona/i);
    const visible = JSON.stringify({ ...data, _note: "" }).replace(/"(slug|ngo|id|level|mode|status|dots)":"[^"]*"/g, "");
    expect(visible).not.toMatch(AVOID);
  });
});
