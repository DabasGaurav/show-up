import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Chip, VerifiedNgoBadge } from "@/components/badges";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { now } from "@/lib/clock";
import { getOrgForUser } from "@/lib/data/orgs";
import { listTasksForOrg, type OrgTaskRow } from "@/lib/data/tasks";
import { fmtCommitment, fmtDateShort, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "NGO dashboard" };

function Gate({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {href && cta && (
        <Link href={href} className={cn(buttonVariants({ size: "tap" }), "mt-5")}>
          {cta}
        </Link>
      )}
    </main>
  );
}

function TaskRow({ t, past }: { t: OrgTaskRow; past: boolean }) {
  const when = t.next_start ?? t.last_start;
  return (
    <li>
      <Link href={`/ngo/tasks/${t.id}`} className="block rounded-xl border bg-card p-4 hover:border-brand/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">{t.cause}</p>
            <h3 className="font-semibold">{t.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {past ? "Last: " : t.commitment === "recurring" ? "Next: " : ""}
              {fmtDateShort(when)}, {fmtTime(when)} · {fmtCommitment(t.commitment, t.recurrence_rule, t.occurrences, t.start_at)}
            </p>
          </div>
          <Chip tone={t.seats_taken >= t.seats_total ? "green" : past ? "grey" : "amber"}>
            {t.seats_taken}/{t.seats_total} booked
          </Chip>
        </div>
      </Link>
    </li>
  );
}

export default async function NgoDashboardPage() {
  const user = await getUser();
  if (!user) {
    return (
      <>
        <AppHeader />
        <Gate
          title="Get volunteers you can trust to turn up"
          body="Confirm your phone, tell us about your NGO, and post your first task in minutes."
          href="/verify?next=/ngo/join"
          cta="Get started"
        />
      </>
    );
  }
  const org = await getOrgForUser(user.id);
  if (!org) {
    return (
      <>
        <AppHeader />
        <Gate title="Join as an NGO" body="Tell us about your organisation to start posting tasks." href="/ngo/join" cta="Join as an NGO" />
      </>
    );
  }
  if (org.status === "pending") {
    return (
      <>
        <AppHeader />
        <Gate
          title="Awaiting approval"
          body={`Thanks, ${org.name} is with the Show-Up team. We approve every NGO before its tasks can be shared, usually within a day.`}
        />
      </>
    );
  }
  if (org.status === "rejected") {
    return (
      <>
        <AppHeader />
        <Gate title="We couldn't approve this sign-up" body="Reply to the Show-Up team and we'll look at it again." />
      </>
    );
  }

  const at = await now();
  const tasks = await listTasksForOrg(org.id, at);
  const upcoming = tasks.filter((t) => t.next_start !== null);
  const past = tasks.filter((t) => t.next_start === null).reverse();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {org.city}
              {org.verified_at && <VerifiedNgoBadge />}
            </p>
          </div>
          <Link href="/ngo/tasks/new" className={buttonVariants({ size: "tap" })}>
            <Plus aria-hidden />
            New task
          </Link>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
              No upcoming tasks. Post one and share the link with your volunteers.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">{upcoming.map((t) => <TaskRow key={t.id} t={t} past={false} />)}</ul>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Past</h2>
            <ul className="mt-3 space-y-3">{past.map((t) => <TaskRow key={t.id} t={t} past />)}</ul>
          </section>
        )}
      </main>
    </>
  );
}
