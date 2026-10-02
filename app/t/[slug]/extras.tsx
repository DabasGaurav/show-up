import type { TaskWithOrg } from "@/lib/data/tasks";

// Prototype-only blocks under the task card (NGO profile panel, Contact NGO).
// Filled in by Milestone 6; renders nothing in MVP1.
export async function TaskExtras(_props: { task: TaskWithOrg; userId: string | null }) {
  return null;
}
