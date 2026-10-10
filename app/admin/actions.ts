"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, lockAdmin, stopViewing, unlockAdmin, viewAs } from "@/lib/auth";
import { now } from "@/lib/clock";
import { CAUSES, HEARD_FROM } from "@/lib/constants";
import { deleteActivity, deleteOrg, deleteSpot, ownerOf, setActivityVisible, setSpotStatus } from "@/lib/data/admin";
import { setPassword } from "@/lib/accounts";
import { createOrg, decideOrg } from "@/lib/data/orgs";
import { MIN_PASSWORD } from "@/lib/password";
import { createActivity } from "@/lib/data/tasks";
import { query, queryOne } from "@/lib/db";
import { istToDate, normalisePhone } from "@/lib/format";
import { readPlace } from "@/lib/place";
import { LIMITS, note, tooMany, visitor } from "@/lib/rate-limit";
import { DAY_MS } from "@/lib/rules";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const guard = async () => {
  if (!(await isAdmin())) throw new Error("Not allowed");
};
const back = (path: string, error: string): never => redirect(`${path}${path.includes("?") ? "&" : "?"}e=${encodeURIComponent(error)}`);

export async function unlockAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const who = `admin-from:${await visitor()}`;
  if (await tooMany(who, LIMITS.adminTries.max, LIMITS.adminTries.minutes)) return { error: "Too many tries. Wait 15 minutes, then try again." };
  if (!(await unlockAdmin(String(form.get("passcode") ?? "")))) {
    await note(who);
    return { error: "That's not it. Try again." };
  }
  redirect("/admin");
}

export async function lockAction() {
  await lockAdmin();
  redirect("/");
}

/** Approve (gives the ✓ and makes their activities visible) or reject an NGO. */
export async function decideOrgAction(form: FormData) {
  await guard();
  await decideOrg(String(form.get("id")), form.get("decision") === "approve");
  revalidatePath("/admin");
}

/** "Open dashboard as this NGO" / "Open My plans as this volunteer". */
export async function viewAsAction(form: FormData) {
  await guard();
  const org = str(form.get("org"));
  const userId = org ? (await ownerOf(org))?.id : str(form.get("user"));
  if (!userId) redirect("/admin?toast=noowner");
  await viewAs(userId);
  redirect(str(form.get("next")) || (org ? "/dashboard" : "/me"));
}

export async function exitViewAction() {
  await stopViewing();
  redirect("/admin");
}

/** Add an NGO, or save changes to one. */
export async function saveOrgAction(form: FormData) {
  await guard();
  const id = str(form.get("id"));
  const here = `/admin/ngo/${id || "new"}`;
  const f = (k: string) => str(form.get(k));
  const causes = form.getAll("causes").map(String).filter((c) => (CAUSES as readonly string[]).includes(c));
  const city = readPlace(form, true);
  const approved = form.get("approved") === "on";
  if (f("name").length < 3) back(here, "Add the NGO's name.");
  if (!city) back(here, "Pick a city, or type the town or village.");
  if (causes.length === 0) back(here, "Pick at least one cause.");
  if (f("contact_name").length < 2) back(here, "Add the coordinator's name.");
  if (f("password") && f("password").length < MIN_PASSWORD) back(here, `The password needs at least ${MIN_PASSWORD} characters.`);
  if (!id && !f("password")) back(here, "Set a password for the coordinator. They sign in with it.");
  const phone = f("phone") ? normalisePhone(f("phone")) : null;
  if (f("phone") && !phone) back(here, "That phone number doesn't look right.");
  const whatsapp = f("whatsapp") ? normalisePhone(f("whatsapp")) : null;
  const heard = (HEARD_FROM as readonly string[]).includes(f("heard_from")) ? f("heard_from") : null;

  if (!id) {
    const email = f("email").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) back(here, "Add the coordinator's email. They sign in with it.");
    let user = await queryOne<{ id: string }>("select id from users where lower(email) = $1", [email]);
    if (user && (await queryOne("select 1 as has from org_members where user_id = $1", [user.id]))) back(here, "That email already runs an NGO.");
    if (!user) {
      const free = phone && !(await queryOne("select 1 as taken from users where phone = $1", [phone]));
      [user] = await query<{ id: string }>("insert into users (name, email, phone, city) values ($1, $2, $3, $4) returning id", [f("contact_name"), email, free ? phone : null, city]);
    }
    if (f("password")) await setPassword(user!.id, f("password"));
    await createOrg(user!.id, {
      name: f("name"), city: city!, causes, contactName: f("contact_name"), contactRole: f("role"), contactPhone: phone,
      registrationNo: f("registration_no") || null, about: f("about") || null, whatsappPhone: whatsapp, heardFrom: heard, approved,
    });
    redirect("/admin?toast=saved");
  }
  // The coordinator's sign-in email can be changed, e.g. from a launch-listing address to their real one.
  const newEmail = f("email").toLowerCase();
  const owner = await ownerOf(id);
  if (owner && newEmail && newEmail !== (owner.email ?? "").toLowerCase()) {
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) back(here, "That email doesn't look right.");
    if (await queryOne("select 1 as taken from users where lower(email) = $1 and id <> $2", [newEmail, owner.id])) back(here, "That email is already on another account.");
    await query("update users set email = $2 where id = $1", [owner.id, newEmail]);
  }
  if (owner && f("password")) await setPassword(owner.id, f("password"));
  await query(
    `update organisations set name = $2, city = $3, causes = $4, about = $5, registration_no = $6, contact_name = $7, contact_phone = $8,
       whatsapp_phone = $9, heard_from = $10 where id = $1`,
    [id, f("name"), city, causes, f("about") || null, f("registration_no") || null, f("contact_name"), phone, whatsapp, heard],
  );
  await query("insert into app_state (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value", [`org_role:${id}`, JSON.stringify(f("role"))]);
  await decideOrg(id, approved);
  redirect("/admin?toast=saved");
}

export async function deleteOrgAction(form: FormData) {
  await guard();
  await deleteOrg(str(form.get("id")));
  redirect("/admin?toast=deleted");
}

/** Add an activity for an NGO, or save changes to one. */
export async function saveActivityAction(form: FormData) {
  await guard();
  const id = str(form.get("id"));
  const orgId = str(form.get("org_id"));
  const here = id ? `/admin/activity/${id}` : `/admin/activity/new?org=${orgId}`;
  const f = (k: string) => str(form.get(k));
  const online = f("mode") === "online";
  const place = readPlace(form, false);
  const people = Number(f("people"));
  const visible = form.get("visible") === "on";
  if (f("title").length < 4) back(here, "Add a title.");
  if (!(CAUSES as readonly string[]).includes(f("cause"))) back(here, "Pick a cause.");
  if (f("role").length < 3) back(here, "Add what volunteers will do.");
  if (f("done_definition").length < 3) back(here, "Add how you'll know it's done.");
  if (online && !/^https?:\/\/\S+\.\S+/.test(f("online_link"))) back(here, "Add the link. It starts with https://");
  if (!online && !place) back(here, "Pick a city, or type the town or village.");
  if (!online && f("address").length < 3) back(here, "Add the address.");
  if (!Number.isInteger(people) || people < 1 || people > 500) back(here, "Say how many people are needed.");
  if (f("contact_name").length < 2) back(here, "Add who to ask for on the day.");
  const phone = f("contact_phone") ? normalisePhone(f("contact_phone")) : "";
  if (phone === null) back(here, "That phone number doesn't look right.");

  if (!id) {
    const org = await queryOne<{ id: string; city: string }>("select id, city from organisations where id = $1", [orgId]);
    if (!org) back("/admin?tab=activities", "Pick an NGO first.");
    const start = istToDate(f("date"), f("start_time"));
    const end = istToDate(f("date"), f("end_time"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) back(here, "Pick a date, a start time and an end time.");
    if (end.getTime() <= start.getTime()) back(here, "The end needs to be after the start.");
    if (start.getTime() <= (await now()).getTime()) back(here, "That time has already passed.");
    const times = Math.min(26, Math.max(1, Number(f("times")) || 1));
    const a = await createActivity({
      org_id: org!.id, title: f("title"), cause: f("cause"), role: f("role"), done_definition: f("done_definition"),
      mode: online ? "online" : "onsite", city: online ? org!.city : place!, address: online ? null : f("address"), lat: null, lng: null,
      online_link: online ? f("online_link") : null, start_at: start, end_at: end, times, slots_needed: people,
      contact_name: f("contact_name"), contact_phone: phone ?? "",
    });
    if (!visible) await setActivityVisible(a.id, false);
    redirect("/admin?tab=activities&toast=saved");
  }
  // Moving the date moves every weekly date with it; saved spots stay on their date.
  if (f("date") || f("start_time") || f("end_time")) {
    const start = istToDate(f("date"), f("start_time"));
    const end = istToDate(f("date"), f("end_time"));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) back(here, "To move it, fill the date, the start time and the end time.");
    if (end.getTime() <= start.getTime()) back(here, "The end needs to be after the start.");
    await query("update tasks set start_at = $2, end_at = $3, duration_min = $4 where id = $1", [id, start, end, Math.round((end.getTime() - start.getTime()) / 60000)]);
    const dates = await query<{ id: string }>("select id from task_occurrences where task_id = $1 order by start_at", [id]);
    for (const [i, d] of dates.entries()) {
      await query("update task_occurrences set start_at = $2, end_at = $3 where id = $1", [d.id, new Date(start.getTime() + i * 7 * DAY_MS), new Date(end.getTime() + i * 7 * DAY_MS)]);
    }
  }
  await query(
    `update tasks set title = $2, cause = $3, role = $4, done_definition = $5, mode = $6, city = case when $6 = 'online' then city else $7 end,
       address = $8, online_link = $9, slots_needed = $10, contact_name = $11, contact_phone = $12, status = $13 where id = $1`,
    [id, f("title"), f("cause"), f("role"), f("done_definition"), online ? "online" : "onsite", place, online ? null : f("address"),
      online ? f("online_link") : null, people, f("contact_name"), phone ?? "", visible ? "published" : "closed"],
  );
  redirect("/admin?tab=activities&toast=saved");
}

export async function toggleActivityAction(form: FormData) {
  await guard();
  await setActivityVisible(str(form.get("id")), form.get("visible") === "1");
  revalidatePath("/admin");
}

export async function deleteActivityAction(form: FormData) {
  await guard();
  await deleteActivity(str(form.get("id")));
  redirect("/admin?tab=activities&toast=deleted");
}

export async function saveSpotAction(form: FormData) {
  await guard();
  if (form.get("delete") === "1") await deleteSpot(str(form.get("id")));
  else await setSpotStatus(str(form.get("id")), str(form.get("status")));
  revalidatePath("/admin");
}

export async function messageDoneAction(form: FormData) {
  await guard();
  await query("update contact_messages set done = $2 where id = $1", [str(form.get("id")), form.get("done") === "1"]);
  revalidatePath("/admin");
}

/** Set a new password for someone who has forgotten theirs. */
export async function setPasswordAction(form: FormData) {
  await guard();
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD) redirect(`/admin?tab=volunteers&e=${encodeURIComponent(`The password needs at least ${MIN_PASSWORD} characters.`)}`);
  await setPassword(str(form.get("user")), password);
  redirect("/admin?tab=volunteers&toast=saved");
}
