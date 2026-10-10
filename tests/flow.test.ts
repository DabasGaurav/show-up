import { describe, expect, it } from "vitest";
import type { User } from "@/lib/auth";
import { freeSpot, getSpot, markWhoCame, pastStatuses, saveSpot, sayYes, factsFor } from "@/lib/data/bookings";
import { createOrg, decideOrg, getOrgForUser, orgStats } from "@/lib/data/orgs";
import { createActivity, getDate, listDates, listUpcoming } from "@/lib/data/tasks";
import { query } from "@/lib/db";
import { runJobs } from "@/lib/jobs";
import { HOUR_MS, DAY_MS, showUpRate, trackRecord } from "@/lib/rules";
import { finishSignIn, hasAccount, startSignIn } from "@/lib/signin";
import fs from "node:fs";
import { createAccount, login, setPassword } from "@/lib/accounts";
import { importListings, type Listings } from "@/lib/import-listings";
import { sendEmail } from "@/lib/notify";
import { seed, seedAllowed } from "@/supabase/seed";

const ORIGIN = "https://test.local";
const T0 = new Date("2026-11-02T06:00:00Z");
const h = (n: number, from: Date) => new Date(from.getTime() + n * HOUR_MS);
let n = 0;

async function person(name = `Person ${++n}`, createdAt = T0): Promise<User> {
  n++;
  const [u] = await query<User>(
    "insert into users (name, phone, email, phone_verified_at, created_at) values ($1, $2, $3, now(), $4) returning *",
    [name, `+9198000${String(n).padStart(5, "0")}`, `p${n}@test.local`, createdAt],
  );
  return u;
}

async function ngo(approved = true) {
  const owner = await person("Coordinator");
  const org = await createOrg(owner.id, { name: `Test Circle ${++n}`, city: "Pune", causes: ["Food"], contactName: "Asha", contactRole: "Founder", contactPhone: "+919800000000", registrationNo: null, about: null });
  if (approved) await decideOrg(org.id, true);
  return { org, owner };
}

async function activity(orgId: string, start: Date, over: { people?: number; times?: number; online?: boolean } = {}) {
  const a = await createActivity({
    org_id: orgId, title: "Pack ration kits", cause: "Food", role: "Sort and pack", done_definition: "All kits packed",
    mode: over.online ? "online" : "onsite", city: "Pune", address: over.online ? null : "Hill Road hall", lat: null, lng: null,
    online_link: over.online ? "https://meet.test/x" : null, start_at: start, end_at: h(2, start), times: over.times ?? 1,
    slots_needed: over.people ?? 2, contact_name: "Asha", contact_phone: "+919800000000",
  });
  return { a, date: (await listDates(a.id))[0] };
}

const emails = (type: string) => query<{ payload: { to: string; text: string } }>("select payload from notifications where type = $1 order by due_at", [type]);

describe("NGO approval", () => {
  it("keeps an NGO's activities hidden until an admin approves it", async () => {
    const { org } = await ngo(false);
    const { a, date } = await activity(org.id, h(100, T0));
    expect((await listUpcoming(T0)).some((x) => x.id === a.id)).toBe(false);
    expect(await saveSpot(await person(), date.id, T0, ORIGIN)).toEqual({ ok: false, reason: "started" });
    await decideOrg(org.id, true);
    const listed = (await listUpcoming(T0)).find((x) => x.id === a.id);
    expect(listed).toMatchObject({ org_checked: true, taken: 0 });
    await decideOrg(org.id, false);
    expect((await listUpcoming(T0)).some((x) => x.id === a.id)).toBe(false);
  });
});

describe("saving, confirming and freeing a spot", () => {
  it("saves a spot if spots are left, one per person per date", async () => {
    const { org } = await ngo();
    const start = h(100, T0);
    const { date } = await activity(org.id, start, { people: 2 });
    const [a, b, c] = [await person(), await person(), await person()];
    const ra = await saveSpot(a, date.id, T0, ORIGIN);
    expect(ra.ok && ra.spot.status).toBe("booked");
    expect(await saveSpot(a, date.id, T0, ORIGIN)).toEqual({ ok: false, reason: "already" });
    expect((await saveSpot(b, date.id, T0, ORIGIN)).ok).toBe(true);
    expect(await saveSpot(c, date.id, T0, ORIGIN)).toEqual({ ok: false, reason: "full" });
    expect(await saveSpot(c, date.id, h(1, start), ORIGIN)).toEqual({ ok: false, reason: "started" });
    const [saved] = (await emails("spot_saved")).filter((e) => e.payload.to === a.email);
    expect(saved.payload.text).toMatch(/^You're in for Pack ration kits with Test Circle \d+ on \w{3}, \d+ \w{3} at \d+:\d\d [ap]m\. We'll check in on \w{3}, \d+ \w{3}\. Plans change\? Free your spot: https:\/\/test\.local\/c\//);
  });

  it("emails at 2 days, reminds once at 1.5 days, and sends details on the morning", async () => {
    const { org } = await ngo();
    const start = new Date("2026-11-14T04:30:00Z"); // Sat 10 am IST
    const { date } = await activity(org.id, start);
    const v = await person("Rohan Verma");
    const r = await saveSpot(v, date.id, T0, ORIGIN);
    if (!r.ok) throw new Error("save failed");
    const mine = async (type: string) => (await emails(type)).filter((e) => e.payload.to === v.email);

    expect((await runJobs(h(-49, start), ORIGIN)).stillOn).toBe(0);
    await runJobs(h(-48, start), ORIGIN);
    expect((await getSpot(r.spot.id))!.status).toBe("awaiting_confirmation");
    expect((await mine("still_on"))[0].payload.text).toMatch(/^Still on for Pack ration kits this Saturday at 10:00 am\? One tap lets Test Circle \d+ plan: /);

    // Even if the scheduled run is late, the reminder never goes out together with the first email.
    await runJobs(h(-47, start), ORIGIN);
    expect(await mine("no_reply")).toHaveLength(0);
    await runJobs(h(-36, start), ORIGIN);
    await runJobs(h(-30, start), ORIGIN);
    expect(await mine("no_reply")).toHaveLength(1);
    expect(await mine("still_on")).toHaveLength(1);

    expect(await sayYes((await getSpot(r.spot.id))!, h(-28, start))).toBe(true);
    expect((await getSpot(r.spot.id))!.status).toBe("confirmed");

    // Morning of: 7 am IST is 3 hours before this 10 am start.
    await runJobs(h(-4, start), ORIGIN);
    expect(await mine("morning_of")).toHaveLength(0);
    await runJobs(h(-3, start), ORIGIN);
    await runJobs(h(-2, start), ORIGIN);
    const morning = await mine("morning_of");
    expect(morning).toHaveLength(1);
    expect(morning[0].payload.text).toMatch(/^Today! Pack ration kits at 10:00 am, Hill Road hall, Pune .*Ask for Asha .*You're done when: All kits packed\. Thanks for showing up 💛$/);
  });

  it("reopens the spot at once and emails the NGO when someone can't make it", async () => {
    const { org, owner } = await ngo();
    const start = h(100, T0);
    const { date } = await activity(org.id, start, { people: 1 });
    const [a, b, c] = [await person("Priya Shah"), await person(), await person()];
    const ra = await saveSpot(a, date.id, T0, ORIGIN);
    if (!ra.ok) throw new Error("save failed");
    expect(await saveSpot(b, date.id, T0, ORIGIN)).toEqual({ ok: false, reason: "full" });

    // At least a day before: nothing goes on the record.
    expect(await freeSpot(ra.spot, "work", h(-30, start))).toBe("released_early");
    expect((await getDate(date.id))!.taken).toBe(0);
    const rb = await saveSpot(b, date.id, h(-29, start), ORIGIN);
    expect(rb.ok && rb.spot.status).toBe("confirmed");
    const toNgo = (await emails("freed_ngo")).filter((e) => e.payload.to === owner.email);
    expect(toNgo.at(-1)!.payload.text).toBe("Priya can't make it to Pack ration kits (work came up). 0 of 1 coming.");
    expect((await emails("freed_volunteer")).some((e) => e.payload.to === a.email && e.payload.text.startsWith("All sorted, your spot is free"))).toBe(true);
    expect(trackRecord((await factsFor([a.id])).get(a.id)!).empty).toBe(true);

    // Later than that: "freed late", and it shows on the track record.
    if (!rb.ok) throw new Error("save failed");
    expect(await freeSpot(rb.spot, null, h(-5, start))).toBe("released_late");
    expect(await freeSpot((await getSpot(rb.spot.id))!, null, h(-4, start))).toBeNull();
    expect(trackRecord((await factsFor([b.id])).get(b.id)!).text).toBe("Came 0 of 1 time · freed 1 late");
    expect((await saveSpot(c, date.id, h(-4, start), ORIGIN)).ok).toBe(true);
  });
});

describe("mark who came", () => {
  it("updates track records, the NGO's stats and the admin number", async () => {
    const before = showUpRate(await pastStatuses(h(2000, T0)));
    const { org, owner } = await ngo();
    const start = h(100, T0);
    const { date } = await activity(org.id, start, { people: 5 });
    const people = [await person(), await person(), await person(), await person()];
    const ids: string[] = [];
    for (const p of people) {
      const r = await saveSpot(p, date.id, T0, ORIGIN);
      if (!r.ok) throw new Error("save failed");
      ids.push(r.spot.id);
    }
    await freeSpot((await getSpot(ids[3]))!, "travel", h(-60, start)); // freed early

    // After the day the NGO is asked to mark who came.
    await runJobs(h(3, start), ORIGIN);
    await runJobs(h(4, start), ORIGIN);
    const asks = (await emails("after_the_day")).filter((e) => e.payload.to === owner.email && e.payload.text.includes(date.id));
    expect(asks).toHaveLength(1);
    expect(asks[0].payload.text).toMatch(/^How did Pack ration kits go\? Mark who came, it takes 30 seconds: https:\/\/test\.local\/dashboard\/a\//);

    expect(await markWhoCame(date.id, { [ids[0]]: "attended", [ids[1]]: "attended", [ids[2]]: "no_show" })).toBe(3);
    const facts = await factsFor(people.map((p) => p.id));
    expect(trackRecord(facts.get(people[0].id)!).text).toBe("Came 1 of 1 time");
    expect(trackRecord(facts.get(people[2].id)!).text).toBe("Came 0 of 1 time · 1 didn't come");
    // A mark can be corrected; another date's spots cannot be marked through this one.
    expect(await markWhoCame(date.id, { [ids[2]]: "attended" })).toBe(1);
    const other = await activity(org.id, start);
    expect(await markWhoCame(other.date.id, { [ids[0]]: "no_show" })).toBe(0);

    const after = showUpRate(await pastStatuses(h(2000, T0)));
    expect(after.came - before.came).toBe(3);
    expect(after.freedEarly - before.freedEarly).toBe(1);
    expect(after.spots - before.spots).toBe(4);
    expect(await orgStats(org.id, h(2000, T0))).toEqual({ volunteers: 3, activitiesRun: 2 });
  });
});

describe("repeats", () => {
  it("makes one date a week, each with its own spots", async () => {
    const { org } = await ngo();
    const start = h(100, T0);
    const { a } = await activity(org.id, start, { times: 4 });
    const dates = await listDates(a.id);
    expect(dates.map((d) => (d.start_at.getTime() - start.getTime()) / DAY_MS)).toEqual([0, 7, 14, 21]);
    const v = await person();
    expect((await saveSpot(v, dates[0].id, T0, ORIGIN)).ok).toBe(true);
    expect((await saveSpot(v, dates[1].id, T0, ORIGIN)).ok).toBe(true);
  });
});

describe("come back", () => {
  it("emails someone who hasn't saved a spot in 30 days, once, with 3 activities", async () => {
    const { org } = await ngo();
    const now = h(24 * 200, T0);
    for (let i = 1; i <= 3; i++) await activity(org.id, h(24 * i, now), { online: true });
    const lapsed = await person("Aditi Kapoor", h(-24 * 60, now));
    const fresh = await person("New Person", h(-24 * 5, now));
    const first = await runJobs(now, ORIGIN, { comeBack: true });
    expect(first.comeBack).toBeGreaterThanOrEqual(1);
    const mine = async (p: User) => (await emails("come_back")).filter((e) => e.payload.to === p.email);
    expect(await mine(lapsed)).toHaveLength(1);
    expect((await mine(lapsed))[0].payload.text).toMatch(/^Free this weekend\? 3 things near you:\n• .*\n• .*\n• /);
    expect(await mine(fresh)).toHaveLength(0);
    // Not again the next day, or the next week.
    await runJobs(h(24, now), ORIGIN, { comeBack: true });
    await runJobs(h(24 * 7, now), ORIGIN, { comeBack: true });
    expect(await mine(lapsed)).toHaveLength(1);
  });
});

describe("sign up and sign in by email link", () => {
  const open = async (r: Awaited<ReturnType<typeof startSignIn>>) => {
    if (!r.ok || !r.link) throw new Error("no link");
    return r.link.split("/").pop()!;
  };

  it("creates the account from sign-up, and never lets a link be used twice", async () => {
    expect(await hasAccount("tara@test.local")).toBe(false);
    const token = await open(await startSignIn({ email: "tara@test.local", next: "/account", signup: { name: "Tara Rao", phone: "+919811100001", city: "Pune", causes: ["Food"] } }, ORIGIN));
    const done = await finishSignIn(token);
    expect(done?.next).toBe("/account");
    expect(await finishSignIn(token)).toBeNull();
    expect(await hasAccount("Tara@test.local")).toBe(true);
    // Someone typing Tara's mobile with their own email gets their own account, not hers or her number.
    const second = await finishSignIn(await open(await startSignIn({ email: "other@test.local", next: "/me", signup: { name: "Someone Else", phone: "+919811100001" } }, ORIGIN)));
    expect(second!.userId).not.toBe(done!.userId);
    const [tara] = await query<{ phone: string; city: string; saved_causes: string[] }>("select phone, city, saved_causes from users where id = $1", [done!.userId]);
    expect(tara).toEqual({ phone: "+919811100001", city: "Pune", saved_causes: ["Food"] });
    // Signing in later needs only the email, and lands on the same account.
    const again = await finishSignIn(await open(await startSignIn({ email: "tara@test.local", next: "/me" }, ORIGIN)));
    expect(again!.userId).toBe(done!.userId);
    // A sign-in link for an email with no account does nothing.
    expect(await finishSignIn(await open(await startSignIn({ email: "nobody@test.local", next: "/me" }, ORIGIN)))).toBeNull();
  });

  it("NGO sign-up makes the account and the NGO together, waiting for approval", async () => {
    const org = { name: "Link Test Trust", city: "Pune", causes: ["Food"], contactName: "Asha Rao", contactRole: "Founder", contactPhone: "+919811100009", registrationNo: null, about: null };
    const done = await finishSignIn(await open(await startSignIn({ email: "asha@test.local", next: "/dashboard", signup: { name: "Asha Rao", phone: "+919811100009", org } }, ORIGIN)));
    const mine = await getOrgForUser(done!.userId);
    expect(mine).toMatchObject({ name: "Link Test Trust", status: "pending", verified_at: null });
  });
});

describe("sample data", () => {
  it("loads locally and is refused when a hosted database is set", async () => {
    expect(seedAllowed()).toBe(true);
    const res = await seed(T0);
    expect(res).toEqual({ ngos: 7, activities: 9 });
    expect((await listUpcoming(T0)).filter((a) => a.org_name.match(/Gyaan|Annadaan|Hunar|Mamta|Prerna|Saath|Hands/)).length).toBe(9);
    process.env.DATABASE_URL = "postgres://example";
    expect(seedAllowed()).toBe(false);
    await expect(seed(T0)).rejects.toThrow("local testing only");
    delete process.env.DATABASE_URL;
  });
});

describe("sign up and sign in with a password", () => {
  it("creates the account at once, signs in with the right password only, and never stores the password", async () => {
    const id = await createAccount({ name: "Meera Nair", email: "Meera@test.local", password: "correct horse", city: "Pune", causes: ["Food"] });
    expect(id).toBeTruthy();
    expect(await createAccount({ name: "Someone", email: "meera@test.local", password: "another one" })).toBeNull();
    expect(await login("meera@test.local", "correct horse")).toEqual({ ok: true, userId: id });
    expect(await login("MEERA@test.local", "wrong password")).toEqual({ ok: false, why: "wrong" });
    expect(await login("nobody@test.local", "whatever1")).toEqual({ ok: false, why: "unknown" });
    const [row] = await query<{ password_hash: string }>("select password_hash from users where id = $1", [id]);
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain("correct horse");
    await setPassword(id!, "a new password");
    expect((await login("meera@test.local", "correct horse")).ok).toBe(false);
    expect((await login("meera@test.local", "a new password")).ok).toBe(true);
  });

  it("NGO sign-up makes the account and the NGO together, waiting for approval", async () => {
    const org = { name: "Password Test Trust", city: "Pune", causes: ["Food"], contactName: "Asha Rao", contactRole: "Founder", contactPhone: "+919811100019", registrationNo: null, about: null };
    const id = await createAccount({ name: "Asha Rao", email: "asha2@test.local", password: "long enough", phone: "+919811100019", org });
    expect(await getOrgForUser(id!)).toMatchObject({ name: "Password Test Trust", status: "pending" });
    // An account made before passwords can't be opened by guessing.
    const old = await person("Old Account");
    expect(await login(old.email!, "anything12")).toEqual({ ok: false, why: "no_password" });
  });
});

describe("launch listings", () => {
  const data = JSON.parse(fs.readFileSync("data/listings.json", "utf8")) as Listings;
  const total = (t: { created: number; updated: number; unchanged: number }) => t.created + t.updated + t.unchanged;

  it("a dry run writes nothing, a real run loads everything, a second run changes nothing", async () => {
    const dry = await importListings(data, { dryRun: true });
    expect([dry.ngos.created, dry.activities.created, dry.volunteers.created]).toEqual([10, 17, 28]);
    expect(await query("select 1 from organisations where is_seed")).toHaveLength(0);

    const first = await importListings(data, { dryRun: false });
    expect([total(first.ngos), total(first.activities), total(first.volunteers)]).toEqual([10, 17, 28]);
    expect(first.warnings.filter((w) => w.startsWith("NGO name to confirm"))).toHaveLength(4);
    expect(first.warnings.every((w) => /confirm/i.test(w))).toBe(true);

    const again = await importListings(data, { dryRun: false });
    expect(again.changes).toEqual([]);
    expect([again.ngos.unchanged, again.activities.unchanged, again.volunteers.unchanged, again.spots.unchanged]).toEqual([10, 17, 28, first.spots.created]);

    const now = new Date("2026-10-05T06:00:00Z");
    const up = await listUpcoming(now);
    expect(up.filter((a) => a.is_seed)).toHaveLength(16); // the 17th has already happened
    expect(up.find((a) => a.share_slug === "bh-n1-clean-up")).toMatchObject({ city: "Shimla", org_checked: true });
    const [weekly] = await query<{ n: number }>("select count(*)::int as n from task_occurrences oc join tasks t on t.id = oc.task_id where t.share_slug = 'make-a-difference-weekly-shelter-class'");
    expect(weekly.n).toBe(12);
  });

  it("never emails a .test address or about a launch-listing spot, and leaves those spots out of the admin number", async () => {
    expect(await sendEmail({ type: "spot_saved", to: "adarsh@showup.test", text: "x" })).toBe("skipped");
    expect(await sendEmail({ type: "spot_saved", to: "real@test.local", text: "x", seed: true })).toBe("skipped");
    expect(await query("select 1 from notifications where payload->>'to' like '%@showup.test'")).toHaveLength(0);

    // Timed jobs run over the loaded spots without writing to anyone.
    const before = (await query("select 1 from notifications")).length;
    await runJobs(new Date("2026-10-09T06:00:00Z"), ORIGIN, { comeBack: true });
    expect(await query("select 1 from notifications where payload->>'to' like '%.test'")).toHaveLength(0);
    expect((await query("select 1 from notifications")).length).toBeGreaterThanOrEqual(before);

    const [{ n }] = await query<{ n: number }>("select count(*)::int as n from bookings where is_seed and status = 'attended'");
    expect(n).toBe(6);
    const seedPast = await query("select 1 from bookings b join task_occurrences oc on oc.id = b.occurrence_id where b.is_seed and oc.start_at <= $1", [new Date("2026-10-05T06:00:00Z")]);
    const counted = await pastStatuses(new Date("2026-10-05T06:00:00Z"));
    const all = await query("select 1 from bookings b join task_occurrences oc on oc.id = b.occurrence_id where oc.start_at <= $1", [new Date("2026-10-05T06:00:00Z")]);
    expect(counted.length).toBe(all.length - seedPast.length);
  });
});
