import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser, type User } from "@/lib/auth";
import { getOrgForUser, type Org } from "@/lib/data/orgs";
import { getTask, type TaskWithOrg } from "@/lib/data/tasks";

/** Signed-in coordinator of an approved organisation, or a redirect to the dashboard gate. */
export async function requireOrg(next: string): Promise<{ user: User; org: Org }> {
  const user = await requireUser(next);
  const org = await getOrgForUser(user.id);
  if (!org || org.status !== "approved") redirect("/ngo");
  return { user, org };
}

/** A task belonging to the coordinator's organisation; anything else is a 404. */
export async function requireOrgTask(id: string): Promise<{ user: User; org: Org; task: TaskWithOrg }> {
  const { user, org } = await requireOrg(`/ngo/tasks/${id}`);
  const task = await getTask(id);
  if (!task || task.org_id !== org.id) notFound();
  return { user, org, task };
}
