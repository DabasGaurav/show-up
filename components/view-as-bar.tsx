import { exitViewAction } from "@/app/admin/actions";
import { viewingAs } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";

/** Shown to the team while they look at an NGO's or a volunteer's pages from /admin. */
export async function ViewAsBar() {
  const user = await viewingAs();
  if (!user) return null;
  const org = await getOrgForUser(user.id);
  return (
    <form action={exitViewAction} className="bg-ink text-white">
      <p className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 text-sm">
        <span className="min-w-0 truncate">Viewing as <strong>{org?.name ?? user.name}</strong></span>
        <button type="submit" className="flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-2">Exit</button>
      </p>
    </form>
  );
}
