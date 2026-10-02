import "server-only";
import { notFound, redirect } from "next/navigation";
import { requireUser, type User } from "@/lib/auth";
import { getOrgForUser, type Org } from "@/lib/data/orgs";
import { getActivity, type ActivityWithOrg } from "@/lib/data/tasks";

/** The signed-in coordinator of an approved NGO; anyone else goes to the right place. */
export async function requireOrg(next: string): Promise<{ user: User; org: Org }> {
  const user = await requireUser(next);
  const org = await getOrgForUser(user.id);
  if (!org) redirect("/for-ngos");
  if (org.status !== "approved") redirect("/dashboard");
  return { user, org };
}

/** One of the coordinator's own activities; anything else is "not found". */
export async function requireOwnActivity(id: string): Promise<{ user: User; org: Org; activity: ActivityWithOrg }> {
  const { user, org } = await requireOrg(`/dashboard/a/${id}`);
  const activity = await getActivity(id);
  if (!activity || activity.org_id !== org.id) notFound();
  return { user, org, activity };
}
