import { describe, expect, it } from "vitest";
import { isEnabled, type FeatureId } from "@/lib/flags";
import { isRouteHidden } from "@/lib/flags/routes";
import { computeMetrics } from "@/lib/data/metrics";
import { createBooking, markAttendance, releaseBooking } from "@/lib/data/bookings";
import { toCsv } from "@/lib/csv";
import { hours, makeOrg, makeTask, makeUser, ORIGIN } from "./helpers";

describe("mode gating (§3, §4)", () => {
  const mvp: FeatureId[] = ["F1", "F2", "F3", "F4", "F5", "F6", "F7"];
  const protoOnly: FeatureId[] = ["F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "LAB", "MESSAGE_PREVIEW", "SIMULATED_CLOCK"];
  it("MVP1 has exactly F1–F7", () => {
    expect(mvp.every((f) => isEnabled(f, "mvp"))).toBe(true);
    expect(protoOnly.some((f) => isEnabled(f, "mvp"))).toBe(false);
  });
  it("the prototype has F1–F17 and the Test Lab", () => {
    expect([...mvp, ...protoOnly].every((f) => isEnabled(f, "prototype"))).toBe(true);
  });
});

describe("route gating (§0.2, §16)", () => {
  const protoOnly = ["/feed", "/feed?city=Pune", "/verify/id", "/me/profile", "/me/rate/abc", "/standby/abc",
    "/ngo/tasks/abc/applicants", "/admin/ids", "/lab", "/lab/export", "/lab/run/abc", "/lab/sessions/abc", "/api/messages"];
  const shared = ["/", "/verify", "/me", "/ngo", "/ngo/join", "/ngo/tasks/new", "/ngo/tasks/abc", "/ngo/tasks/abc/turnout/def",
    "/t/some-task", "/t/some-task/book", "/c/token", "/admin", "/admin/metrics", "/admin/export", "/admin/export/bookings", "/api/cron"];
  it("returns 404 for F8–F17 and /lab in MVP mode", () => {
    for (const p of protoOnly) expect(isRouteHidden(p.split("?")[0], "mvp"), p).toBe(true);
    for (const p of protoOnly) expect(isRouteHidden(p.split("?")[0], "prototype"), p).toBe(false);
  });
  it("keeps the MVP1 routes in both modes", () => {
    for (const p of shared) {
      expect(isRouteHidden(p, "mvp"), p).toBe(false);
      expect(isRouteHidden(p, "prototype"), p).toBe(false);
    }
  });
  it("hides the manual queues in the prototype, which automates them", () => {
    expect(isRouteHidden("/admin/reminders", "prototype")).toBe(true);
    expect(isRouteHidden("/admin/released", "prototype")).toBe(true);
    expect(isRouteHidden("/admin/released", "mvp")).toBe(false);
  });
});

describe("MVP1 metrics (§10)", () => {
  it("computes the primary and secondary metrics from past events", async () => {
    const T0 = new Date("2027-03-01T06:00:00Z");
    const a = await makeOrg("Metrics NGO A");
    const b = await makeOrg("Metrics NGO B");
    const start = hours(100, T0);
    const e1 = await makeTask(a.id, start, { slots_needed: 6, title: "Event one" });
    const e2 = await makeTask(b.id, hours(10, start), { slots_needed: 6, title: "Event two" });
    const book = async (occ: string, at = T0) => {
      const r = await createBooking({ user: await makeUser(), occurrenceId: occ, source: "link", now: at, origin: ORIGIN });
      if (!r.ok) throw new Error("booking failed");
      return r.booking;
    };
    // Event one: 3 attended, 1 no-show, 1 early release (60h before), 1 late release (6h before).
    const one = [await book(e1.occ.id), await book(e1.occ.id), await book(e1.occ.id), await book(e1.occ.id)];
    await releaseBooking(await book(e1.occ.id), "work", hours(-60, start));
    await releaseBooking(await book(e1.occ.id), null, hours(-6, start));
    await markAttendance(e1.occ.id, { [one[0].id]: "attended", [one[1].id]: "attended", [one[2].id]: "attended", [one[3].id]: "no_show" });
    // Event two: 2 attended, 1 left unmarked.
    const two = [await book(e2.occ.id), await book(e2.occ.id), await book(e2.occ.id)];
    await markAttendance(e2.occ.id, { [two[0].id]: "attended", [two[1].id]: "attended" });

    const all = await computeMetrics(hours(200, T0));
    const mine = all.events.filter((e) => ["Event one", "Event two"].includes(e.title));
    const ev1 = mine.find((e) => e.title === "Event one")!;
    const ev2 = mine.find((e) => e.title === "Event two")!;
    // (3 attended + 1 early) ÷ 6 = 66.7%
    expect(ev1).toMatchObject({ total: 6, attended: 3, releasedEarly: 1, releasedLate: 1, noShows: 1, showUpOrEarlyReleaseRate: 66.7, noShowRate: 16.7 });
    // The unmarked booking is excluded from the rate.
    expect(ev2).toMatchObject({ total: 2, attended: 2, notRecorded: 1, showUpOrEarlyReleaseRate: 100 });
    expect(all.perNgo.find((n) => n.org_name === "Metrics NGO A")).toMatchObject({ events: 1, total: 6, showUpOrEarlyReleaseRate: 66.7 });
    expect(all.seatsReleased).toBeGreaterThanOrEqual(2);
    expect(all.medianReleaseLeadHours).not.toBeNull();
    // Nothing from the future is counted.
    expect((await computeMetrics(T0)).events.filter((e) => e.title.startsWith("Event ")).length).toBe(0);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and newlines and neutralises formulas", () => {
    expect(toCsv(["a", "b"], [["x,y", 'say "hi"'], ["=SUM(A1)", null], [["p", "q"], new Date("2026-01-01T00:00:00Z")], [-5, "line\nbreak"]])).toBe(
      'a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),\r\np; q,2026-01-01T00:00:00.000Z\r\n-5,"line\nbreak"\r\n',
    );
  });
});
