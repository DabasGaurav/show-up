"use server";

import { redirect } from "next/navigation";
import { now } from "@/lib/clock";
import { CAUSES, CITY_NAMES } from "@/lib/constants";
import { createActivity } from "@/lib/data/tasks";
import { track } from "@/lib/events";
import { istToDate, normalisePhone } from "@/lib/format";
import { requireOrg } from "@/lib/ngo";

export interface PostState {
  errors?: Record<string, string>;
  message?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function postActivityAction(_prev: PostState, form: FormData): Promise<PostState> {
  const { user, org } = await requireOrg("/dashboard/new");
  const f = (k: string) => str(form.get(k));
  const errors: Record<string, string> = {};
  const need = (k: string, what: string, min: number) => {
    if (f(k).length < min) errors[k] = `Please add ${what}.`;
  };

  need("title", "a title", 4);
  if (!(CAUSES as readonly string[]).includes(f("cause"))) errors.cause = "Pick a cause.";
  need("role", "what volunteers will do", 3);
  need("done_definition", "how you'll know it's done", 3);

  const start = istToDate(f("date"), f("start_time"));
  const end = istToDate(f("date"), f("end_time"));
  if (Number.isNaN(start.getTime())) errors.date = "Pick a date and a start time.";
  else if (start.getTime() <= (await now()).getTime()) errors.date = "That time has already passed. Pick a later one.";
  if (Number.isNaN(end.getTime())) errors.end_time = "Pick an end time.";
  else if (end.getTime() <= start.getTime()) errors.end_time = "The end needs to be after the start.";

  const repeats = f("repeats") === "on";
  const times = repeats ? Number(f("times")) : 1;
  if (repeats && (!Number.isInteger(times) || times < 2 || times > 26)) errors.times = "Between 2 and 26 weeks.";

  const online = f("mode") === "online";
  const lat = Number(f("lat"));
  const lng = Number(f("lng"));
  if (online) {
    if (!/^https?:\/\/\S+\.\S+/.test(f("online_link"))) errors.online_link = "Please add the link. It starts with https://";
  } else {
    if (!CITY_NAMES.includes(f("city"))) errors.city = "Pick a city.";
    need("address", "the address", 6);
  }

  const people = Number(f("people"));
  if (!Number.isInteger(people) || people < 1 || people > 500) errors.people = "Tell us how many people you need.";
  need("contact_name", "who to ask for on the day", 2);
  const phone = normalisePhone(f("contact_phone"));
  if (!phone) errors.contact_phone = "That number doesn't look right. It should have 10 digits.";

  if (Object.keys(errors).length > 0) return { errors, message: "A few details are missing. They're marked above." };

  const a = await createActivity({
    org_id: org.id, title: f("title"), cause: f("cause"), role: f("role"), done_definition: f("done_definition"),
    mode: online ? "online" : "onsite",
    city: online ? org.city : f("city"),
    address: online ? null : f("address"),
    lat: online || Number.isNaN(lat) ? null : lat,
    lng: online || Number.isNaN(lng) ? null : lng,
    online_link: online ? f("online_link") : null,
    start_at: start, end_at: end, times, slots_needed: people, contact_name: f("contact_name"), contact_phone: phone!,
  });
  await track("activity_posted", { activity: a.id }, user.id);
  redirect(`/dashboard/a/${a.id}?new=1&toast=posted`);
}
