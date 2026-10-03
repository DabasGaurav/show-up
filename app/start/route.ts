import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";

export const dynamic = "force-dynamic";

// Where someone lands after signing in with nowhere particular to go:
// an NGO's coordinator on their dashboard, everyone else on the activities.
export async function GET(req: Request) {
  const toast = new URL(req.url).searchParams.get("toast");
  const q = toast ? `?toast=${encodeURIComponent(toast)}` : "";
  const user = await getUser();
  if (!user) redirect("/signin");
  redirect((await getOrgForUser(user.id)) ? `/dashboard${q}` : `/${q}#results`);
}
