import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarCheck, Users } from "lucide-react";
import { ActivityCard } from "@/components/activity-card";
import { CauseImage } from "@/components/cause-image";
import { Avatar, CauseChip, Tick } from "@/components/kit";
import { Header } from "@/components/site-header";
import { cardOf } from "@/lib/activity-view";
import { now } from "@/lib/clock";
import { getOrgBySlug, orgStats } from "@/lib/data/orgs";
import { listUpcoming } from "@/lib/data/tasks";

export async function generateMetadata(props: PageProps<"/ngo/[slug]">): Promise<Metadata> {
  const org = await getOrgBySlug((await props.params).slug);
  return { title: org?.status === "approved" ? org.name : "Not found" };
}

// NGO page.
export default async function NgoPage(props: PageProps<"/ngo/[slug]">) {
  const { slug } = await props.params;
  const org = await getOrgBySlug(slug);
  // An NGO is public only once our team has approved it.
  if (!org || org.status !== "approved") notFound();
  const at = await now();
  const [stats, upcoming] = await Promise.all([orgStats(org.id, at), listUpcoming(at, org.id)]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-2">
        <div className="overflow-hidden rounded-xl bg-card">
          <CauseImage cause={org.causes[0] ?? ""} sizes="(min-width: 1024px) 672px, 100vw" priority className="h-44 sm:h-56" />
          <div className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={org.name} className="size-12 text-base" />
              <div className="min-w-0">
                <h1 className="text-2xl leading-7">{org.name}</h1>
                <p className="flex items-center gap-1.5 text-sm text-ink-soft"><Tick className="size-4 [&>svg]:size-3" />Checked by Show-Up · {org.city}</p>
              </div>
            </div>
            <p className="mt-3 flex flex-wrap gap-2">{org.causes.map((c) => <CauseChip key={c} cause={c} />)}</p>
            {org.about && <p className="mt-3 line-clamp-2">{org.about}</p>}
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 font-semibold"><Users className="size-4 shrink-0 text-primary" aria-hidden />{stats.volunteers} {stats.volunteers === 1 ? "volunteer has" : "volunteers have"} joined</li>
              <li className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 font-semibold"><CalendarCheck className="size-4 shrink-0 text-warn" aria-hidden />{stats.activitiesRun} {stats.activitiesRun === 1 ? "activity" : "activities"} run</li>
            </ul>
          </div>
        </div>

        <h2 className="mt-6 text-2xl">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">Nothing coming up just now.</p>
        ) : (
          <ul className="mt-3 space-y-3">{upcoming.map((a) => <li key={a.id}><ActivityCard a={cardOf(a)} href={`/a/${a.share_slug}`} /></li>)}</ul>
        )}
      </main>
    </>
  );
}
