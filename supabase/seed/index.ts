import { randomUUID } from "node:crypto";
import { CITIES } from "@/lib/constants";
import type { Db } from "@/lib/db";
import { istDateKey, istToDate, slugify, weekendDays } from "@/lib/format";
import { DAY_MS, HOUR_MS, trustLevel, type BookingFact, type BookingStatus, type IdStatus } from "@/lib/rules";

// Prototype sample data (PRD §11). Every NGO, person, phone number and place is
// fictional. All dates are relative to `base`, so the data always looks current.

type Row = Record<string, unknown>;

/** Bulk insert: one statement per table keeps reseeding fast on a remote database. */
async function insertMany(db: Db, table: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table}, $1::jsonb)`, [
    JSON.stringify(rows),
  ]);
}

/** Small deterministic PRNG so every reseed produces the same data. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED_IDS = {
  testerVolunteer: "00000000-0000-4000-8000-000000000001",
  testerCoordinator: "00000000-0000-4000-8000-000000000002",
  testerOrg: "00000000-0000-4000-8000-000000000010",
  sh5Task: "00000000-0000-4000-8000-000000000020",
  sh7Task: "00000000-0000-4000-8000-000000000021",
  sh7Occurrence: "00000000-0000-4000-8000-000000000022",
  sh3Task: "00000000-0000-4000-8000-000000000023",
  sh3Occurrence: "00000000-0000-4000-8000-000000000024",
  sh2Tasks: [
    "00000000-0000-4000-8000-000000000031",
    "00000000-0000-4000-8000-000000000032",
    "00000000-0000-4000-8000-000000000033",
  ],
} as const;

const ORGS = [
  { name: "Akshar Learning Circle", city: "Delhi NCR", causes: ["Teaching"], verified: true, lateReplies: 1,
    about: "Weekend reading and maths circles for children in Classes 3 to 6. Volunteers work in pairs with a trained lead." },
  { name: "Hara Bhara Trust", city: "Pune", causes: ["Plantation"], verified: true, lateReplies: 0,
    about: "Native-tree plantation and aftercare drives on Pune's hills. Every sapling is tagged and watered for two years." },
  { name: "Annapoorna Food Bank", city: "Bengaluru", causes: ["Food distribution"], verified: true, lateReplies: 2,
    about: "Collects surplus food and packs ration kits for 600 families a month. Short, well-run packing shifts." },
  { name: "Paws & Care Shelter", city: "Hyderabad", causes: ["Animal welfare"], verified: true, lateReplies: 0,
    about: "A shelter for injured street animals. Volunteers help with feeding, walks and adoption days." },
  { name: "Swasthya Saathi", city: "Delhi NCR", causes: ["Health camps"], verified: true, lateReplies: 1,
    about: "Free neighbourhood health camps run with volunteer doctors. Non-medical volunteers manage registration and queues." },
  { name: "Saath Elder Care", city: "Bengaluru", causes: ["Elderly care"], verified: true, lateReplies: 0,
    about: "Companionship visits and digital-help sessions for seniors living alone." },
  { name: "Digital Disha", city: "Pune", causes: ["Skill-based", "Teaching"], verified: true, lateReplies: 3,
    about: "Online, skill-based help for small non-profits: design, websites, accounts and content." },
  // Unverified, new, no reviews (used in SH2).
  { name: "Neev Community Group", city: "Delhi NCR", causes: ["Health camps", "Teaching", "Plantation"], verified: false, lateReplies: 0,
    about: "A new residents' group organising neighbourhood drives." },
] as const;

const COORDINATORS = ["Ritu Malhotra", "Sameer Kulkarni", "Lakshmi Rao", "Farhan Qureshi", "Dr. Nandini Bose", "Joseph Mathew", "Tanvi Deshpande", "Gurpreet Sandhu"];

const VOLUNTEER_NAMES = [
  // The first five are the SH5 applicants (§11).
  "Ananya Krishnan", "Rohan Mehta", "Zoya Siddiqui", "Karthik Nair", "Priya Sharma",
  "Aarav Gupta", "Diya Reddy", "Kabir Singh", "Meher Kapoor", "Ishaan Joshi", "Sana Sheikh", "Vivaan Iyer",
  "Tara Menon", "Arjun Pillai", "Naina Verma", "Dev Chatterjee", "Aisha Khan", "Rahul Bhatt", "Pooja Hegde",
  "Nikhil Saxena", "Shreya Banerjee", "Aditya Rao", "Kiara Dsouza", "Manav Thakur", "Riya Agarwal", "Yash Patil",
  "Simran Kaur", "Harsh Vardhan", "Neha Kulkarni", "Varun Shetty", "Ira Mukherjee", "Siddharth Jain", "Mira Fernandes",
  "Om Prakash", "Lavanya Subramanian", "Kunal Desai", "Fatima Ansari", "Abhay Chauhan", "Tanya Bhatia", "Reyansh Goel",
];

const VOL_TAGS = ["On time", "Prepared", "Would invite again"];
const NGO_TAGS = ["Well organised", "Clear brief", "Felt welcome"];
const PAST_DAYS = [3, 7, 10, 14, 21, 28, 35, 45, 50, 60, 65, 75, 85, 100, 120, 150];

interface History {
  day: number;
  org: number;
  status: BookingStatus;
  score?: number;
  tags?: string[];
}

export async function reseed(db: Db, base: Date = new Date()): Promise<void> {
  await db.exec(
    `truncate table lab_sessions, events, notifications, ratings, standby_offers, standby, bookings,
       task_occurrences, tasks, org_members, organisations, users restart identity cascade;
     delete from app_state where key not in ('clock_offset_ms');`,
  );
  await seed(db, base);
}

export async function seed(db: Db, base: Date = new Date()): Promise<void> {
  const rand = rng(20261002);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const iso = (d: Date) => d.toISOString();
  /** A moment `offsetDays` from the seed day at an IST wall-clock time. */
  const dayAt = (offsetDays: number, time: string) => istToDate(istDateKey(new Date(base.getTime() + offsetDays * DAY_MS)), time);
  const phone = (n: number) => `+9190000${String(n).padStart(5, "0")}`;

  const users: Row[] = [];
  const orgs: Row[] = [];
  const members: Row[] = [];
  const tasks: Row[] = [];
  const occurrences: Row[] = [];
  const bookings: Row[] = [];
  const ratings: Row[] = [];
  const standby: Row[] = [];
  const offers: Row[] = [];

  const user = (id: string, name: string, n: number, o: Row = {}) =>
    users.push({
      id, role: "volunteer", name, phone: phone(n), phone_verified_at: iso(new Date(base.getTime() - 200 * DAY_MS)),
      email: `${slugify(name).replace(/-/g, ".")}@example.org`, city: "Delhi NCR", is_online_ok: true, saved_causes: [],
      level: "new", id_status: "none", created_at: iso(new Date(base.getTime() - 200 * DAY_MS)),
      last_active_at: iso(new Date(base.getTime() - 2 * DAY_MS)), ...o,
    });

  // ---------------------------------------------------------------- NGOs
  const orgIds = ORGS.map((_, i) => (i === 2 ? SEED_IDS.testerOrg : randomUUID()));
  ORGS.forEach((o, i) => {
    const coordinatorId = i === 2 ? SEED_IDS.testerCoordinator : randomUUID();
    user(coordinatorId, COORDINATORS[i], 100 + i, { role: "ngo_member", city: o.city });
    orgs.push({
      id: orgIds[i], type: i === 7 ? "community" : "ngo", name: o.name, slug: slugify(o.name), city: o.city, causes: o.causes,
      registration_no: o.verified ? `REG/${o.city.slice(0, 2).toUpperCase()}/20${11 + i}/0${412 + i * 37}` : null,
      tax_12a_80g: o.verified && i % 2 === 0 ? `80G/${2015 + i}/${1100 + i * 13}` : null,
      verified_at: o.verified ? iso(new Date(base.getTime() - (300 - i * 20) * DAY_MS)) : null,
      about: o.about, photos: [1, 2, 3].map((n) => `illus:${o.causes[0]}:${n}`),
      contact_name: COORDINATORS[i], contact_phone: phone(100 + i), invite_code: null, status: "approved",
      created_at: iso(new Date(base.getTime() - (i === 7 ? 12 : 320 - i * 20) * DAY_MS)),
    });
    members.push({ org_id: orgIds[i], user_id: coordinatorId, role: "owner" });
  });

  // ---------------------------------------------------------------- tasks
  let slugN = 0;
  const addTask = (t: {
    id?: string; org: number; title: string; role: string; done: string; cause?: string; mode?: "onsite" | "online";
    start: Date; hours: number; slots: number; minTrust?: string; approval?: boolean;
    rule?: "weekly" | "daily" | "fortnightly"; count?: number; occurrenceId?: string; km?: number; address?: string;
  }): { id: string; occurrenceIds: string[]; start: Date } => {
    const o = ORGS[t.org];
    const id = t.id ?? randomUUID();
    const mode = t.mode ?? "onsite";
    const centre = CITIES[o.city];
    // Place each on-site task a known distance from the city centre (used by the distance filter).
    const km = t.km ?? 1 + Math.floor(rand() * 9);
    const angle = rand() * Math.PI * 2;
    const end = new Date(t.start.getTime() + t.hours * HOUR_MS);
    const count = t.rule ? (t.count ?? 4) : 1;
    const step = t.rule === "daily" ? 1 : t.rule === "fortnightly" ? 14 : 7;
    tasks.push({
      id, org_id: orgIds[t.org], title: t.title, cause: t.cause ?? o.causes[0], role: t.role, done_definition: t.done,
      mode, city: o.city, address: mode === "onsite" ? (t.address ?? `${pick(["Community Hall", "Ward Office", "Public Library", "Sports Ground", "Resource Centre"])}, ${pick(["Sector 12", "Lake Road", "Market Lane", "Station Road", "Hill View Colony"])}`) : null,
      lat: mode === "onsite" ? Math.round((centre.lat + (km / 111) * Math.cos(angle)) * 1e5) / 1e5 : null,
      lng: mode === "onsite" ? Math.round((centre.lng + (km / (111 * Math.cos((centre.lat * Math.PI) / 180))) * Math.sin(angle)) * 1e5) / 1e5 : null,
      online_link: mode === "online" ? `https://meet.example.org/${slugify(t.title)}` : null,
      start_at: iso(t.start), end_at: iso(end), duration_min: t.hours * 60,
      commitment: t.rule ? "recurring" : "one_off", recurrence_rule: t.rule ?? null, occurrences: count,
      slots_needed: t.slots, min_trust: t.minTrust ?? "everyone", booking_mode: t.approval ? "approval" : "instant",
      contact_name: COORDINATORS[t.org], contact_role: "Volunteer coordinator", contact_phone: phone(100 + t.org),
      share_slug: `${slugify(t.title)}-${(++slugN).toString(36)}`, status: "published",
      created_at: iso(new Date(Math.min(t.start.getTime() - 9 * DAY_MS, base.getTime() - DAY_MS))),
    });
    const occurrenceIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const oid = i === 0 && t.occurrenceId ? t.occurrenceId : randomUUID();
      occurrenceIds.push(oid);
      occurrences.push({
        id: oid, task_id: id,
        start_at: iso(new Date(t.start.getTime() + i * step * DAY_MS)),
        end_at: iso(new Date(end.getTime() + i * step * DAY_MS)),
      });
    }
    return { id, occurrenceIds, start: t.start };
  };

  // Past sessions: one per NGO per PAST_DAYS entry. They carry every volunteer's history.
  const PAST_TITLES = ["Reading circle", "Sapling drive", "Ration kit packing", "Shelter morning shift", "Health camp desk", "Companion visits", "Website clinic", "Neighbourhood clean-up"];
  // Neev is new, so it has none.
  const past: { occ: string; start: Date; approval: boolean }[][] = ORGS.map((o, org) =>
    (o.verified ? PAST_DAYS : []).map((day, j) => {
      const approval = org !== 7 && j % 2 === 0; // half the past sessions needed approval → response rate
      const t = addTask({
        org, title: `${PAST_TITLES[org]} (${istDateKey(dayAt(-day, "10:00")).slice(5)})`, role: "Volunteer",
        done: "Session completed and the handover sheet signed by the lead.", start: dayAt(-day, org % 2 ? "16:00" : "10:00"),
        hours: 2 + (j % 2), slots: 14, approval, mode: org === 6 ? "online" : "onsite",
      });
      return { occ: t.occurrenceIds[0], start: t.start, approval };
    }),
  );

  const facts = new Map<string, BookingFact[]>();
  const taken = new Set<string>();
  const lateBudget: number[] = ORGS.map((o) => o.lateReplies);
  const book = (
    userId: string, occurrenceId: string, start: Date, status: BookingStatus,
    o: { source?: string; approval?: boolean; id?: string; reason?: string; createdDaysBefore?: number; org?: number; durationMin?: number } = {},
  ): string | null => {
    const key = `${occurrenceId}:${userId}`;
    if (taken.has(key)) return null;
    taken.add(key);
    const id = o.id ?? randomUUID();
    const created = new Date(Math.min(start.getTime() - (o.createdDaysBefore ?? 6) * DAY_MS, base.getTime() - HOUR_MS));
    const released = status === "released_early" ? new Date(start.getTime() - 60 * HOUR_MS)
      : status === "released_late" ? new Date(start.getTime() - 9 * HOUR_MS) : null;
    // Approval sessions: the NGO answered within a few hours, except a few late replies per NGO.
    let decided: Date | null = null;
    if (o.approval && status !== "requested") {
      const late = o.org !== undefined && lateBudget[o.org] > 0 && created.getTime() > base.getTime() - 85 * DAY_MS;
      if (late) lateBudget[o.org!]--;
      decided = new Date(created.getTime() + (late ? 60 : 3 + Math.floor(rand() * 20)) * HOUR_MS);
    }
    bookings.push({
      id, occurrence_id: occurrenceId, user_id: userId, status, source: o.source ?? "link",
      confirm_token: `seed-${id}`,
      confirmed_at: ["confirmed", "attended", "no_show"].includes(status) ? iso(new Date(start.getTime() - 40 * HOUR_MS)) : null,
      released_at: released ? iso(released) : null, release_reason: released ? (o.reason ?? pick(["work", "health", "travel", "other"])) : null,
      decided_at: decided ? iso(decided) : null, created_at: iso(created),
    });
    if (!facts.has(userId)) facts.set(userId, []);
    facts.get(userId)!.push({ status, startAt: start, durationMin: o.durationMin ?? 120 });
    return id;
  };

  const addHistory = (userId: string, history: History[]) => {
    for (const h of history) {
      const j = PAST_DAYS.indexOf(h.day);
      const p = past[h.org][j];
      const id = book(userId, p.occ, p.start, h.status, { approval: p.approval, org: h.org, durationMin: (2 + (j % 2)) * 60 });
      if (!id || h.status !== "attended") continue;
      const at = iso(new Date(p.start.getTime() + 5 * HOUR_MS));
      ratings.push({ id: randomUUID(), booking_id: id, rater_type: "ngo", score: h.score ?? (rand() < 0.7 ? 5 : 4), tags: h.tags ?? VOL_TAGS.filter(() => rand() < 0.5), created_at: at });
      if (rand() < 0.8) {
        ratings.push({ id: randomUUID(), booking_id: id, rater_type: "volunteer", score: rand() < 0.65 ? 5 : 4, tags: NGO_TAGS.filter(() => rand() < 0.6), created_at: at });
      }
    }
  };
  const attended = (days: number[], orgs: number[], extra: Partial<History> = {}): History[] =>
    days.map((day, i) => ({ day, org: orgs[i % orgs.length], status: "attended" as const, ...extra }));

  // ---------------------------------------------------------------- volunteers
  const vol: { id: string; idStatus: IdStatus; city: string; causes: string[] }[] = [];
  const CITY_ROTATION = ["Delhi NCR", "Bengaluru", "Pune", "Hyderabad", "Delhi NCR", "Bengaluru"];
  VOLUNTEER_NAMES.forEach((name, i) => {
    const id = randomUUID();
    // 0–4: SH5 applicants. 5–13 Trusted, 14–24 Verified, 25 two no-shows, 26–33 New with history, 34–39 New, no history.
    const idStatus: IdStatus = i === 2 || i >= 26 ? "none" : "approved";
    const city = i < 5 ? "Bengaluru" : CITY_ROTATION[i % CITY_ROTATION.length];
    const causes = [ORGS[i % 7].causes[0], ORGS[(i + 3) % 7].causes[0]];
    vol.push({ id, idStatus, city, causes });
    user(id, name, 200 + i, {
      city, saved_causes: causes, id_status: idStatus,
      created_at: iso(new Date(base.getTime() - (i === 2 ? 4 : 160 + ((i * 7) % 90)) * DAY_MS)),
    });
    const o = [i % 7, (i + 2) % 7, (i + 4) % 7];
    if (i === 0) {
      // 1. Trusted, 9/9 attended, 4.8★ (seven 5s and two 4s).
      addHistory(id, [3, 7, 10, 14, 21, 28, 35, 45, 60].map((day, k) => ({ day, org: [2, 5, 0][k % 3], status: "attended" as const, score: k < 7 ? 5 : 4, tags: ["On time", "Prepared"] })));
    } else if (i === 1) {
      // 2. Verified, 3/4, 1 late release (only one attended slot is inside 90 days).
      addHistory(id, [...attended([45, 100, 120], [2, 5]), { day: 21, org: 2, status: "released_late" }]);
    } else if (i === 3) {
      // 4. Verified, 5/7, 2 no-shows → paused from Verified-only tasks.
      addHistory(id, [...attended([35, 45, 60, 75, 85], [2, 5, 0]), { day: 10, org: 5, status: "no_show" }, { day: 21, org: 2, status: "no_show" }]);
    } else if (i === 4) {
      // 5. Trusted, 12/12, "Would invite again" ×5.
      addHistory(id, [3, 7, 10, 14, 21, 28, 35, 45, 60, 75, 85, 100].map((day, k) => ({ day, org: [5, 2, 0, 4][k % 4], status: "attended" as const, score: 5, tags: k < 5 ? ["Would invite again", "On time"] : ["On time"] })));
    } else if (i >= 5 && i <= 13) {
      addHistory(id, attended([7, 21, 35, 60, 75].slice(0, 3 + (i % 3)), o));
      if (i % 4 === 0) addHistory(id, [{ day: 100, org: o[0], status: "released_early" }]);
    } else if (i >= 14 && i <= 24) {
      addHistory(id, attended([10, 45].slice(0, 1 + (i % 2)), o));
      if (i <= 17) addHistory(id, [{ day: 14, org: o[1], status: "released_late" }]);
      if (i === 20) addHistory(id, [{ day: 28, org: o[2], status: "no_show" }]);
    } else if (i === 25) {
      addHistory(id, [...attended([45, 60, 75], o), { day: 28, org: o[0], status: "no_show" }, { day: 7, org: o[1], status: "no_show" }]);
    } else if (i >= 26 && i <= 33) {
      addHistory(id, attended([14, 50].slice(0, 1 + (i % 2)), o));
      if (i <= 28) addHistory(id, [{ day: 35, org: o[1], status: "released_late" }]);
    }
  });

  // Request history for the response rate (§5.8): each verified NGO answered ~24 further
  // requests on its approval sessions. Declined requests do not touch anyone's reliability record.
  ORGS.forEach((o, org) => {
    if (!o.verified) return;
    past[org].forEach((p, j) => {
      if (!p.approval || PAST_DAYS[j] > 85) return;
      for (let k = 0; k < 4; k++) book(vol[5 + ((org * 5 + j * 3 + k * 7) % 35)].id, p.occ, p.start, "declined", { approval: true, org });
    });
  });

  // The tester's own volunteer account: Verified, 2 attended (both with Akshar), Teaching + Plantation, Delhi NCR.
  user(SEED_IDS.testerVolunteer, "Asha Tester", 1, {
    city: "Delhi NCR", saved_causes: ["Teaching", "Plantation"], id_status: "approved",
    created_at: iso(new Date(base.getTime() - 120 * DAY_MS)),
  });
  addHistory(SEED_IDS.testerVolunteer, attended([50, 65], [0]));

  // ---------------------------------------------------------------- upcoming tasks
  const [sat, sun] = weekendDays(base);
  const off = (d: Date) => Math.round((istToDate(istDateKey(d), "12:00").getTime() - istToDate(istDateKey(base), "12:00").getTime()) / DAY_MS);
  // If "today" is already a weekend day, keep weekend sessions in the future.
  const wk = (d: Date, time: string) =>
    [off(d), off(sun), off(d) + 7]
      .map((o) => dayAt(o, time))
      .find((t) => t.getTime() > base.getTime() + 3 * HOUR_MS)!;
  const S = off(sat) <= 0 ? off(sun) : off(sat); // first bookable weekend day
  const fill: { occ: string; start: Date; n: number; minTrust: string; approval: boolean; org: number }[] = [];
  const up = (t: Parameters<typeof addTask>[0] & { booked?: number }) => {
    const r = addTask(t);
    if (t.booked) fill.push({ occ: r.occurrenceIds[0], start: t.start, n: t.booked, minTrust: t.minTrust ?? "everyone", approval: t.approval ?? false, org: t.org });
    return r;
  };

  // Delhi NCR · Teaching and Plantation this weekend (SH1: the tester's saved causes and city).
  up({ org: 0, title: "Saturday reading circle", role: "Reading buddy for Classes 3–4", done: "Each child has read one story aloud and the reading log is filled in.", start: wk(sat, "10:00"), hours: 2, slots: 8, booked: 5, km: 3 });
  up({ org: 0, title: "Maths games morning", role: "Table lead for a group of 5 children", done: "All four games played and the score sheet handed to the lead.", start: wk(sun, "09:30"), hours: 3, slots: 6, booked: 2, minTrust: "verified", km: 4 });
  up({ org: 7, title: "Park plantation morning", role: "Planting and watering", done: "Forty saplings planted, staked and watered.", cause: "Plantation", start: wk(sat, "07:00"), hours: 2, slots: 12, booked: 3, km: 2 });
  up({ org: 7, title: "Evening homework help", role: "Homework helper for Classes 5–6", done: "Each child's homework checked and the register signed.", cause: "Teaching", start: wk(sun, "17:00"), hours: 2, slots: 5, booked: 1, km: 6 });
  up({ org: 0, title: "After-school reading circle", role: "Reading buddy", done: "One chapter read with each group and the log filled in.", start: dayAt(S + 3, "16:30"), hours: 2, slots: 6, booked: 2, rule: "weekly", count: 4, km: 3 });
  up({ org: 0, title: "Library sorting afternoon", role: "Sort and label donated books", done: "All six cartons sorted by reading level and shelved.", start: dayAt(S + 8, "14:00"), hours: 3, slots: 4, booked: 3, minTrust: "trusted", km: 8 });
  up({ org: 0, title: "Exam-week doubt clinic", role: "Maths doubt-solver for Class 6", done: "Every child's doubt list cleared and marked done.", start: dayAt(S + 12, "10:00"), hours: 5, slots: 5, approval: true, booked: 1, km: 5 });

  // Delhi NCR · Health camps. Three similar tasks for SH2: one verified NGO, two from an unverified group.
  const SH2_DONE = "Every visitor registered, guided to a doctor, and the register handed over.";
  up({ id: SEED_IDS.sh2Tasks[0], org: 4, title: "Health camp helper", role: "Registration and queue desk", done: SH2_DONE, start: wk(sat, "09:00"), hours: 3, slots: 8, booked: 4, km: 4 });
  up({ id: SEED_IDS.sh2Tasks[1], org: 7, title: "Community health camp helper", role: "Registration and queue desk", done: SH2_DONE, cause: "Health camps", start: wk(sat, "09:30"), hours: 3, slots: 8, booked: 1, km: 4 });
  up({ id: SEED_IDS.sh2Tasks[2], org: 7, title: "Weekend health camp volunteer", role: "Registration and queue desk", done: SH2_DONE, cause: "Health camps", start: wk(sat, "10:00"), hours: 3, slots: 8, km: 5 });
  up({ org: 4, title: "Eye check-up camp", role: "Guide visitors between stations", done: "All registered visitors screened and the tally sheet signed.", start: dayAt(S + 7, "08:30"), hours: 5, slots: 10, booked: 6, minTrust: "verified", km: 9 });
  up({ org: 4, title: "Blood donation drive desk", role: "Donor registration", done: "Every donor form checked and filed; refreshments stocked.", start: dayAt(S + 10, "10:00"), hours: 3, slots: 6, booked: 5, km: 7 });

  // Pune · Plantation.
  up({ org: 1, title: "Hill plantation drive", role: "Planting and watering", done: "Sixty saplings planted, tagged and watered.", start: wk(sat, "06:30"), hours: 3, slots: 20, booked: 11 });
  up({ org: 1, title: "Sapling aftercare walk", role: "Water and check tagged saplings", done: "Every tagged sapling on the route watered and logged in the app.", start: dayAt(S + 4, "07:00"), hours: 2, slots: 8, booked: 3, rule: "weekly", count: 3 });
  up({ org: 1, title: "Nursery potting day", role: "Fill and pot seedling bags", done: "Three hundred seedling bags filled and stacked.", start: dayAt(S + 9, "09:00"), hours: 5, slots: 10, booked: 9, minTrust: "verified" });

  // Bengaluru · Food distribution and elderly care.
  up({ id: SEED_IDS.sh5Task, org: 2, title: "Saturday food drive", role: "Pack and hand out ration kits", done: "Two hundred ration kits packed and handed to the listed families.", start: wk(sat, "08:00"), hours: 3, slots: 6, approval: true });
  const sh7 = up({ id: SEED_IDS.sh7Task, occurrenceId: SEED_IDS.sh7Occurrence, org: 2, title: "Sunday ration kit drive", role: "Pack ration kits on the line", done: "Five hundred kits packed, counted and loaded.", start: wk(sun, "09:00"), hours: 3, slots: 15 });
  up({ org: 2, title: "Weekday surplus pick-up", role: "Collect surplus food with the van team", done: "All four pick-ups done and the weight log filled in.", start: dayAt(S + 2, "20:00"), hours: 2, slots: 3, booked: 2, minTrust: "trusted" });
  up({ org: 2, title: "Community kitchen prep", role: "Chop and pack vegetables", done: "Prep list completed and the kitchen wiped down.", start: dayAt(S + 6, "07:30"), hours: 3, slots: 8, booked: 7, rule: "weekly", count: 4 });
  up({ org: 5, title: "Tea-time companion visits", role: "Spend time with two seniors", done: "Two visits made and the visit note written.", start: wk(sun, "16:00"), hours: 2, slots: 6, booked: 3, minTrust: "verified" });
  up({ org: 5, title: "Phone help hour for seniors", role: "Teach video calls and UPI basics", done: "Each senior has made one video call on their own.", start: dayAt(S + 5, "11:00"), hours: 2, slots: 5, booked: 2, rule: "fortnightly", count: 2 });
  up({ org: 5, title: "Seniors' picnic day", role: "Escort and help at the park", done: "Everyone back at the centre and the attendance sheet signed.", start: dayAt(S + 13, "09:00"), hours: 5, slots: 8, booked: 2, approval: true });

  // Hyderabad · Animal welfare.
  up({ org: 3, title: "Shelter morning shift", role: "Feeding and kennel cleaning", done: "All kennels cleaned, bowls refilled and the checklist ticked.", start: wk(sat, "07:30"), hours: 3, slots: 6, booked: 4 });
  up({ org: 3, title: "Adoption day helper", role: "Welcome visitors and handle forms", done: "Every visitor form filed and the adoption board updated.", start: dayAt(S + 8, "10:00"), hours: 5, slots: 8, booked: 3, minTrust: "verified" });
  up({ org: 3, title: "Evening dog walks", role: "Walk two shelter dogs", done: "Both dogs walked for 30 minutes and the walk log filled in.", start: dayAt(S + 3, "17:30"), hours: 2, slots: 4, booked: 4, rule: "weekly", count: 3 });

  // Online · Skill-based.
  up({ org: 6, mode: "online", title: "Design a donation poster", role: "Graphic designer", done: "One A4 poster and one square version delivered as editable files.", start: dayAt(S + 2, "19:00"), hours: 2, slots: 2, booked: 1 });
  up({ org: 6, mode: "online", title: "Fix a small NGO website", role: "Web developer (WordPress)", done: "The three listed bugs fixed and checked on mobile.", start: dayAt(S + 5, "18:00"), hours: 3, slots: 3, booked: 1, minTrust: "verified", approval: true });
  up({ org: 6, mode: "online", title: "Monthly accounts clean-up", role: "Accounts volunteer", done: "Last month's entries reconciled and the summary sheet shared.", start: dayAt(S + 9, "10:00"), hours: 3, slots: 2, minTrust: "trusted" });
  up({ org: 6, mode: "online", title: "Spoken English practice hour", role: "Conversation partner", done: "A 40-minute conversation completed with each of two learners.", cause: "Teaching", start: dayAt(S + 1, "19:30"), hours: 2, slots: 6, booked: 3, rule: "weekly", count: 3 });
  // SH3: the tester's own booking sits here once the scenario starts.
  addTask({ id: SEED_IDS.sh3Task, occurrenceId: SEED_IDS.sh3Occurrence, org: 0, title: "Weekend story-telling session", role: "Story-teller for Classes 1–2", done: "Two stories told and the children's drawings collected.", start: dayAt(S + 7, "10:00"), hours: 2, slots: 6, km: 3 });

  // Pre-fill upcoming sessions with eligible volunteers (so some are nearly full).
  const levelOf = (i: number) => trustLevel(vol[i].idStatus, facts.get(vol[i].id) ?? [], base);
  const RANK = { everyone: 0, new: 0, verified: 1, trusted: 2 } as Record<string, number>;
  let cursor = 5;
  for (const f of fill) {
    let added = 0;
    for (let tries = 0; added < f.n && tries < 80; tries++) {
      const i = 5 + (cursor++ % 35);
      if (RANK[levelOf(i)] < RANK[f.minTrust]) continue;
      const soon = f.start.getTime() - base.getTime() < 48 * HOUR_MS;
      if (book(vol[i].id, f.occ, f.start, soon || added % 3 === 0 ? "confirmed" : "booked", { createdDaysBefore: 4, approval: f.approval })) added++;
    }
  }

  // SH5: five applicants waiting on the Saturday food drive (requests made a few hours ago).
  const sh5 = occurrences.find((o) => o.task_id === SEED_IDS.sh5Task)!;
  for (let i = 0; i < 5; i++) {
    bookings.push({
      id: randomUUID(), occurrence_id: sh5.id, user_id: vol[i].id, status: "requested", source: "feed",
      confirm_token: `seed-sh5-${i}`, confirmed_at: null, released_at: null, release_reason: null, decided_at: null,
      created_at: iso(new Date(base.getTime() - (3 + i) * HOUR_MS)),
    });
  }

  // SH7: a 15-person drive showing confirmed, unconfirmed, released and a seat filled by standby.
  const sh7Occ = sh7.occurrenceIds[0];
  const sh7Vols = Array.from({ length: 16 }, (_, k) => vol[5 + k].id);
  sh7Vols.slice(0, 9).forEach((u) => book(u, sh7Occ, sh7.start, "confirmed"));
  sh7Vols.slice(9, 12).forEach((u) => book(u, sh7Occ, sh7.start, "booked"));
  const releasedA = book(sh7Vols[12], sh7Occ, sh7.start, "released_early", { reason: "work" })!;
  const releasedB = book(sh7Vols[13], sh7Occ, sh7.start, "released_early", { reason: "travel" })!;
  book(sh7Vols[14], sh7Occ, sh7.start, "confirmed", { source: "standby", createdDaysBefore: 0 });
  // Fix release times relative to the seed moment (the helper derives them from the start).
  for (const b of bookings) {
    if (b.id === releasedA) b.released_at = iso(new Date(base.getTime() - 7 * HOUR_MS));
    if (b.id === releasedB) b.released_at = iso(new Date(base.getTime() - 2 * HOUR_MS));
  }
  const offer = (released: string, userId: string, status: string, hoursAgo: number) =>
    offers.push({
      id: randomUUID(), booking_released_id: released, occurrence_id: sh7Occ, user_id: userId,
      sent_at: iso(new Date(base.getTime() - hoursAgo * HOUR_MS)), expires_at: iso(new Date(base.getTime() - (hoursAgo - 2) * HOUR_MS)), status,
    });
  offer(releasedA, sh7Vols[14], "accepted", 7);
  offer(releasedA, vol[22].id, "taken", 7);
  offer(releasedA, vol[24].id, "taken", 7);
  offer(releasedB, sh7Vols[15], "sent", 1);
  offer(releasedB, vol[23].id, "sent", 1);

  // A few volunteers are on standby this weekend.
  for (const [k, i] of [6, 9, 12, 15, 19, 22, 23, 24, 30].entries()) {
    standby.push({
      id: randomUUID(), user_id: vol[i].id, date: istDateKey(k % 2 ? sun : sat), city: k % 3 === 0 ? "Bengaluru" : vol[i].city,
      is_online: k % 4 === 0, causes: [], active: true,
    });
  }

  // Store each person's derived level.
  for (const u of users) {
    if (u.role === "volunteer") u.level = trustLevel(u.id_status as IdStatus, facts.get(u.id as string) ?? [], base);
  }

  await insertMany(db, "users", users);
  await insertMany(db, "organisations", orgs);
  await insertMany(db, "org_members", members);
  await insertMany(db, "tasks", tasks);
  await insertMany(db, "task_occurrences", occurrences);
  await insertMany(db, "bookings", bookings);
  await insertMany(db, "ratings", ratings);
  await insertMany(db, "standby", standby);
  await insertMany(db, "standby_offers", offers);
  await db.query(
    `insert into app_state (key, value) values ('seeded_at', to_jsonb($1::text))
     on conflict (key) do update set value = excluded.value`,
    [iso(base)],
  );
}
