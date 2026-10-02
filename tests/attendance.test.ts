import { describe, expect, it } from "vitest";
import {
  bookingFacts, createBooking, getBooking, markAttendance, occurrenceTurnout,
} from "@/lib/data/bookings";
import { runJobs } from "@/lib/jobs";
import { mvpMetrics, reliabilityRecord, reliabilityString } from "@/lib/rules";
import { hours, makeOrg, makeTask, makeUser, ORIGIN } from "./helpers";

const T0 = new Date("2026-12-01T06:00:00Z");

describe("attendance and reliability record (F5, F6, F7)", () => {
  it("updates the reliability record as soon as attendance is saved", async () => {
    const org = await makeOrg();
    const start = hours(100, T0);
    const { task, occ } = await makeTask(org.id, start, { slots_needed: 4 });
    const [a, b, c] = [await makeUser(), await makeUser(), await makeUser()];
    const ids: string[] = [];
    for (const u of [a, b, c]) {
      const r = await createBooking({ user: u, occurrenceId: occ.id, source: "link", now: T0, origin: ORIGIN });
      if (!r.ok) throw new Error("booking failed");
      ids.push(r.booking.id);
    }
    expect(reliabilityString(reliabilityRecord(await bookingFacts(a.id)))).toBe("No slots yet");

    const changed = await markAttendance(occ.id, { [ids[0]]: "attended", [ids[1]]: "no_show" });
    expect(changed).toBe(2);
    expect(reliabilityString(reliabilityRecord(await bookingFacts(a.id)))).toBe("Attended 1 of 1 booked slot · 0 late releases · 0 no-shows");
    expect(reliabilityString(reliabilityRecord(await bookingFacts(b.id)))).toBe("Attended 0 of 1 booked slot · 0 late releases · 1 no-show");

    // A mark can be corrected; saving the same mark again changes nothing.
    expect(await markAttendance(occ.id, { [ids[0]]: "attended", [ids[1]]: "attended" })).toBe(1);
    expect((await getBooking(ids[1]))!.status).toBe("attended");

    // A booking from another occurrence cannot be marked through this one.
    const other = await makeTask(org.id, start);
    expect(await markAttendance(other.occ.id, { [ids[2]]: "no_show" })).toBe(0);

    // The unmarked booking becomes not_recorded after 72h and is excluded from metrics.
    await runJobs(hours(73, start), ORIGIN);
    expect((await getBooking(ids[2]))!.status).toBe("not_recorded");
    const t = await occurrenceTurnout(occ.id, task.slots_needed);
    expect(t.booked).toBe(3);
    const m = mvpMetrics([{ status: "attended" }, { status: "attended" }, { status: "not_recorded" }]);
    expect(m).toMatchObject({ total: 2, showUpOrEarlyReleaseRate: 100 });
  });
});
