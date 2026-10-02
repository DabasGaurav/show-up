import type { User } from "@/lib/auth";
import { createTask, listOccurrences, type Task } from "@/lib/data/tasks";
import { query } from "@/lib/db";
import { HOUR_MS } from "@/lib/rules";

let n = 0;

export const ORIGIN = "https://test.local";
export const hours = (h: number, from: Date) => new Date(from.getTime() + h * HOUR_MS);

export async function makeUser(over: Partial<User> = {}): Promise<User> {
  n++;
  const [u] = await query<User>(
    `insert into users (name, phone, email, phone_verified_at, id_status, city, saved_causes)
     values ($1, $2, $3, now(), $4, $5, $6) returning *`,
    [over.name ?? `Volunteer ${n}`, `+9190000${String(n).padStart(5, "0")}`, over.email ?? `v${n}@example.org`,
     over.id_status ?? "none", over.city ?? "Pune", over.saved_causes ?? []],
  );
  return u;
}

export async function makeOrg(name = `Test Circle ${++n}`): Promise<{ id: string; coordinator: User }> {
  const [org] = await query<{ id: string }>(
    "insert into organisations (name, slug, city, status) values ($1, $2, 'Pune', 'approved') returning id",
    [name, `org-${n}`],
  );
  const coordinator = await makeUser({ name: "Coordinator" });
  await query("insert into org_members (org_id, user_id, role) values ($1, $2, 'owner')", [org.id, coordinator.id]);
  return { id: org.id, coordinator };
}

export async function makeTask(orgId: string, start: Date, over: Partial<Task> = {}) {
  const task = await createTask({
    org_id: orgId, title: "Sapling drive", cause: "Plantation", role: "Planter",
    done_definition: "Fifty saplings planted and watered", mode: "onsite", city: "Pune",
    address: "Hill Road Park", lat: 18.52, lng: 73.85, online_link: null,
    start_at: start, end_at: hours(2, start), commitment: "one_off", recurrence_rule: null, occurrences: 1,
    slots_needed: 2, min_trust: "everyone", booking_mode: "instant",
    contact_name: "Asha", contact_role: "Coordinator", contact_phone: "+919000099999",
    ...over,
  });
  const [occ] = await listOccurrences(task.id);
  return { task, occ };
}

export const messages = (type: string) =>
  query<{ type: string; channel: string; status: string; payload: { text: string; to: string } }>(
    "select type, channel, status, payload from notifications where type = $1 order by due_at",
    [type],
  );
