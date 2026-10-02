import { createActivity } from "@/lib/data/tasks";
import { query } from "@/lib/db";
import { istDateKey, istToDate, slugify, weekendDays } from "@/lib/format";
import { DAY_MS } from "@/lib/rules";

// Sample activities for local testing only (spec §6), based on what our interviewees
// described. Every NGO and person here is made up. Never load this in production.

export function seedAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL && !process.env.VERCEL;
}

const NGOS = [
  { name: "Gyaan Ghar Foundation", city: "Delhi NCR", causes: ["Teaching"], about: "After-school learning for children in a basti.", owner: "Shalini Rawat" },
  { name: "Saath Sikhein Collective", city: "Jaipur", causes: ["Teaching"], about: "Weekend learning sessions, in person and on video calls.", owner: "Kavya Mathur" },
  { name: "Annadaan Noida Circle", city: "Delhi NCR", causes: ["Food"], about: "Collects good leftover food and packs ration kits for families.", owner: "Rekha Joshi" },
  { name: "Prerna Shiksha Sangathan", city: "Pune", causes: ["Teaching"], about: "A family-run school that is free for every child.", owner: "Sunil Pawar" },
  { name: "Mamta Shishu Ashray", city: "Delhi NCR", causes: ["Teaching", "Health"], about: "Day care for the children of domestic workers.", owner: "Meena Chauhan" },
  { name: "Hunar Haath Collective", city: "Delhi NCR", causes: ["Skills"], about: "Two founders working with women artisans.", owner: "Anjali Bedi" },
  { name: "Hands Together Seva", city: "Delhi NCR", causes: ["Trees & green", "Health"], about: "Tree-planting weekends and blood donation camps.", owner: "Harpreet Gill" },
];

const VOLUNTEERS = ["Rohan Verma", "Aditi Kapoor", "Divya Menon", "Sana Khan", "Kabir Tandon", "Meera Jain", "Arnav Puri", "Ishaan Rao"];

export async function seed(now: Date = new Date()): Promise<{ ngos: number; activities: number }> {
  if (!seedAllowed()) throw new Error("Sample data is for local testing only.");
  await query("delete from organisations");
  await query("delete from users where email like '%@example.org'");
  await query("delete from notifications");

  const dayAt = (offset: number, time: string) => istToDate(istDateKey(new Date(now.getTime() + offset * DAY_MS)), time);
  const off = (d: Date) => Math.max(1, Math.round((d.getTime() - now.getTime()) / DAY_MS));
  const [sat, sun] = weekendDays(now).map(off);

  const person = async (name: string, n: number, role = "volunteer") =>
    (await query<{ id: string }>(
      "insert into users (name, phone, email, phone_verified_at, role, city, created_at) values ($1, $2, $3, now(), $4, 'Delhi NCR', $5) returning id",
      [name, `+9190000${String(n).padStart(5, "0")}`, `${slugify(name).replace(/-/g, ".")}@example.org`, role, new Date(now.getTime() - 90 * DAY_MS)],
    ))[0].id;

  const orgIds: string[] = [];
  for (const [i, n] of NGOS.entries()) {
    const owner = await person(n.owner, 100 + i, "ngo_member");
    const [o] = await query<{ id: string }>(
      `insert into organisations (name, slug, city, causes, about, contact_name, contact_phone, status, verified_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'approved', now()) returning id`,
      [n.name, slugify(n.name), n.city, n.causes, n.about, n.owner, `+9190000${String(100 + i).padStart(5, "0")}`],
    );
    await query("insert into org_members (org_id, user_id, role) values ($1, $2, 'owner')", [o.id, owner]);
    orgIds.push(o.id);
  }
  const vols: string[] = [];
  for (const [i, v] of VOLUNTEERS.entries()) vols.push(await person(v, 200 + i));

  const add = (org: number, a: { title: string; cause: string; role: string; done: string; day: number; start: string; hours: number; people: number; times?: number; online?: boolean; address?: string; city?: string }) => {
    const start = dayAt(a.day, a.start);
    return createActivity({
      org_id: orgIds[org], title: a.title, cause: a.cause, role: a.role, done_definition: a.done,
      mode: a.online ? "online" : "onsite", city: a.city ?? NGOS[org].city, address: a.online ? null : (a.address ?? null), lat: null, lng: null,
      online_link: a.online ? "https://meet.example.org/show-up" : null,
      start_at: start, end_at: new Date(start.getTime() + a.hours * 3600e3), times: a.times ?? 1, slots_needed: a.people,
      contact_name: NGOS[org].owner.split(" ")[0], contact_phone: `+9190000${String(100 + org).padStart(5, "0")}`,
    });
  };

  const made = [
    await add(0, { title: "Science with hands-on kits for class 6–8", cause: "Teaching", role: "Run one experiment with a small group", done: "Every child has tried the experiment and the kit is packed away", day: sat, start: "11:00", hours: 1, people: 6, times: 4, address: "Gyaan Ghar centre, Sangam Vihar" }),
    await add(1, { title: "Spoken English class for a Rajasthan village school", cause: "Teaching", role: "Lead a one-hour speaking class on a video call", done: "Each child has spoken at least three full sentences", day: 3, start: "18:00", hours: 1, people: 4, times: 5, online: true }),
    await add(2, { title: "Pick up leftover restaurant food and share it out", cause: "Food", role: "Collect the food, check it, and hand it out", done: "All the food is given out and the crates are back", day: sat, start: "19:00", hours: 2, people: 8, address: "Sector 18 market, Noida" }),
    await add(2, { title: "Pack 200 ration kits", cause: "Food", role: "Sort and pack rice, dal and oil", done: "All 200 kits are packed and stacked", day: sun, start: "10:00", hours: 3, people: 15, address: "Community hall, Sector 12, Noida" }),
    await add(3, { title: "Village mela talk: keeping girls in school", cause: "Teaching", role: "Talk with parents at the stall and hand out leaflets", done: "The stall is packed up and the day's notes are handed over", day: sat + 7, start: "10:00", hours: 6, people: 4, address: "Village mela ground, near Aurangabad" }),
    await add(4, { title: "Story time at the day-care centre", cause: "Teaching", role: "Read stories and play games with children aged 3 to 6", done: "The children are settled and the room is tidy", day: 4, start: "16:00", hours: 2, people: 3, times: 4, address: "Mamta day-care centre, Mayur Vihar" }),
    await add(5, { title: "Design a catalogue for a women's artisan collective", cause: "Skills", role: "Lay out a 6-page catalogue from product photos", done: "The catalogue is shared as a PDF", day: 5, start: "17:00", hours: 3, people: 1, online: true }),
    await add(6, { title: "Tree planting along the canal", cause: "Trees & green", role: "Dig, plant and water saplings", done: "Your row of saplings is planted and watered", day: sat, start: "07:00", hours: 3, people: 25, address: "Canal road, Okhla" }),
    await add(6, { title: "Blood camp registration desk", cause: "Health", role: "Welcome donors and fill in their forms", done: "Every donor's form is filed", day: sun, start: "09:00", hours: 4, people: 4, address: "Community centre, Lajpat Nagar" }),
  ];

  // A few spots, so "Who's coming" and track records have something to show.
  const dateOf = async (activityId: string) => (await query<{ id: string; start_at: Date }>("select id, start_at from task_occurrences where task_id = $1 order by start_at limit 1", [activityId]))[0];
  const spot = async (user: string, date: { id: string; start_at: Date }, status: string, reason: string | null = null) =>
    query(
      `insert into bookings (occurrence_id, user_id, status, source, confirm_token, confirmed_at, released_at, release_reason, created_at)
       values ($1, $2, $3, 'link', $4, $5, $6, $7, $8)`,
      [date.id, user, status, `sample-${date.id.slice(0, 8)}-${user.slice(0, 8)}`,
       ["confirmed", "attended", "no_show"].includes(status) ? new Date(date.start_at.getTime() - DAY_MS) : null,
       status.startsWith("released") ? new Date(date.start_at.getTime() - (status === "released_early" ? 60 : 8) * 3600e3) : null,
       reason, new Date(now.getTime() - 3 * DAY_MS)],
    );
  const kits = await dateOf(made[3].id);
  for (const [i, v] of vols.entries()) await spot(v, kits, i < 4 ? "confirmed" : i < 6 ? "booked" : i === 6 ? "released_early" : "confirmed", i === 6 ? "work" : null);

  // One activity last week, already marked, so people have a track record.
  const pastStart = dayAt(-6, "10:00");
  const [pastTask] = await query<{ id: string }>(
    `insert into tasks (org_id, city, title, cause, role, done_definition, mode, address, start_at, end_at, duration_min, slots_needed, contact_name, contact_role, contact_phone, share_slug, status)
     values ($1, 'Delhi NCR', 'Pack 150 ration kits', 'Food', 'Sort and pack rice, dal and oil', 'All 150 kits are packed', 'onsite', 'Community hall, Sector 12, Noida', $2, $3, 180, 8, 'Rekha', '', '+919000000102', 'pack-150-ration-kits-sample', 'published') returning id`,
    [orgIds[2], pastStart, new Date(pastStart.getTime() + 3 * 3600e3)],
  );
  const [pastDate] = await query<{ id: string; start_at: Date }>("insert into task_occurrences (task_id, start_at, end_at) values ($1, $2, $3) returning id, start_at", [pastTask.id, pastStart, new Date(pastStart.getTime() + 3 * 3600e3)]);
  const outcome = ["attended", "attended", "attended", "attended", "attended", "released_early", "no_show", "released_late"];
  for (const [i, v] of vols.entries()) await spot(v, pastDate, outcome[i], outcome[i].startsWith("released") ? "travel" : null);

  return { ngos: NGOS.length, activities: made.length };
}
