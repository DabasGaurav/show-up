import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { OnePeep } from "@/components/art";
import { DateBlock, Tick, WhoBar } from "@/components/kit";
import { Header } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { listDashboard, type DashboardDate } from "@/lib/data/tasks";
import { dateBlock, fmtTimeRange } from "@/lib/format";
import { canMark } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

function Row({ d, past, marking }: { d: DashboardDate; past: boolean; marking: boolean }) {
  const marked = d.came + d.didnt_come;
  return (
    <li>
      <Link href={`/dashboard/a/${d.activity_id}?d=${d.date_id}`} className="block rounded-xl bg-card p-4 hover:ring-2 hover:ring-primary/20">
        <div className="flex gap-3.5">
          <DateBlock {...dateBlock(d.start_at)} className="self-start" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg leading-6">{d.title}</h3>
            <p className="mt-0.5 text-sm text-ink-soft">{fmtTimeRange(d.start_at, d.end_at)}</p>
            {past ? (
              <p className="mt-2 font-semibold">
                {marking && d.to_mark > 0 ? <span className={buttonVariants({ size: "tap" })}>Mark who came</span>
                  : marked > 0 ? <span className="text-ok">{d.came} of {marked} came</span>
                  : <span className="text-ink-soft">Nobody was marked</span>}
              </p>
            ) : (
              <WhoBar className="mt-3" who={{ needed: d.slots_needed, coming: d.coming, notHeardBack: d.not_heard_back, cantMakeIt: d.cant_make_it, stillNeeded: Math.max(0, d.slots_needed - d.coming - d.not_heard_back) }} />
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

// NGO dashboard.
export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const org = await getOrgForUser(user.id);
  if (!org) redirect("/for-ngos");

  if (org.status !== "approved") {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8 text-center">
          <OnePeep index={0} />
          <h1 className="mt-4 text-3xl leading-9 text-balance">
            {org.status === "pending" ? "Thanks! We'll call you within a day to get you live." : "We couldn't get you live this time."}
          </h1>
          <p className="mt-3 text-ink-soft">
            {org.status === "pending" ? "We speak to every NGO first. It's how volunteers know you're real." : "Reply to our email and we'll look again together."}
          </p>
        </main>
      </>
    );
  }

  const at = await tick();
  const dates = await listDashboard(org.id);
  const upcoming = dates.filter((d) => d.end_at.getTime() >= at.getTime());
  const past = dates.filter((d) => d.end_at.getTime() < at.getTime()).reverse().slice(0, 20);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl leading-10">{org.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-ink-soft"><Tick className="size-4 [&>svg]:size-3" />Checked by Show-Up</p>
          </div>
          <Link href="/dashboard/new" className={buttonVariants({ size: "tap" })}><Plus aria-hidden />Post a new activity</Link>
        </div>

        <h2 className="mt-7 text-2xl">Upcoming activities</h2>
        {upcoming.length === 0 ? (
          <section className="mt-3 rounded-xl bg-card p-6 text-center">
            <OnePeep index={3} />
            <p className="mt-3 font-heading text-xl font-semibold">Nothing coming up.</p>
            <Link href="/dashboard/new" className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Post a new activity</Link>
          </section>
        ) : (
          <ul className="mt-3 space-y-3">{upcoming.map((d) => <Row key={d.date_id} d={d} past={false} marking={false} />)}</ul>
        )}

        {past.length > 0 && (
          <>
            <h2 className="mt-8 text-2xl">Past activities</h2>
            <ul className="mt-3 space-y-3">{past.map((d) => <Row key={d.date_id} d={d} past marking={canMark(d.start_at, at)} />)}</ul>
          </>
        )}
      </main>
    </>
  );
}
