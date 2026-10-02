import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { EmptyArt, PackingArt } from "@/components/art";
import { DateBlock, TrustTick, WhoBar } from "@/components/kit";
import { buttonVariants } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { getOrgForUser } from "@/lib/data/orgs";
import { listOrgSessions, type OrgSession } from "@/lib/data/tasks";
import { dateBlock, fmtTimeRange, fmtWeekday, istHour } from "@/lib/format";
import { canMarkAttendance, HOUR_MS } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My NGO" };

function Gate({ title, sub, note, href, cta }: { title: string; sub: string; note?: string; href?: string; cta?: string }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-4 py-6 sm:grid-cols-2">
      <div>
        <h1 className="hero-title text-balance">{title}</h1>
        <p className="mt-4 text-lg leading-7 text-ink-soft">{sub}</p>
        {note && <p className="mt-2 text-ink-soft italic">{note}</p>}
        {href && cta && <Link href={href} className={cn(buttonVariants({ size: "tap" }), "mt-6 h-14 px-7 text-lg")}>{cta}</Link>}
      </div>
      <PackingArt className="w-full" />
    </main>
  );
}

function SessionCard({ s, past, marking }: { s: OrgSession; past: boolean; marking: boolean }) {
  const href = `/ngo/tasks/${s.task_id}/turnout/${s.occurrence_id}`;
  const went = s.came + s.missed;
  return (
    <li>
      <Link href={href} className="block rounded-xl bg-card p-4 hover:ring-2 hover:ring-primary/20">
        <div className="flex gap-3.5">
          <DateBlock {...dateBlock(s.start_at)} className="self-start" />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg leading-6">{s.title}</h3>
            <p className="mt-0.5 text-sm text-ink-soft">{fmtTimeRange(s.start_at, s.end_at)}</p>
            {past ? (
              <p className="mt-2 font-semibold">
                {marking && s.unmarked > 0 ? (
                  <span className={cn(buttonVariants({ size: "tap" }))}>Mark who came</span>
                ) : went > 0 ? (
                  <span className="text-ok">{s.came} of {went} came</span>
                ) : (
                  <span className="text-ink-soft">Nobody was marked</span>
                )}
              </p>
            ) : (
              <WhoBar className="mt-3" counts={{ needed: s.slots_needed, coming: s.coming, saved: s.saved, waiting: s.waiting, freed: s.freed }} />
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

// NGO onboarding and dashboard (brief B7, B9).
export default async function NgoPage() {
  const user = await getUser();
  if (!user) {
    return (
      <>
        <AppHeader />
        <Gate
          title="Spend your time on the cause, not on chasing people."
          sub="Post what you need, share one link, and see who's really coming."
          href="/verify?next=/ngo/join"
          cta="Get started, it's free"
        />
      </>
    );
  }
  const org = await getOrgForUser(user.id);
  if (!org) {
    return (
      <>
        <AppHeader />
        <Gate
          title="Spend your time on the cause, not on chasing people."
          sub="Post what you need, share one link, and see who's really coming."
          href="/ngo/join"
          cta="Get started, it's free"
        />
      </>
    );
  }
  if (org.status !== "approved") {
    return (
      <>
        <AppHeader />
        <Gate
          title={org.status === "pending" ? "Thanks! We'll have you set up within a day." : "We couldn't set this up yet."}
          sub={org.status === "pending" ? "We call every NGO before they go live. It's how volunteers know you're real." : "Reply to our message and we'll take another look together."}
        />
      </>
    );
  }

  const at = await tick();
  const sessions = await listOrgSessions(org.id);
  const upcoming = sessions.filter((s) => s.end_at.getTime() >= at.getTime());
  const past = sessions.filter((s) => s.end_at.getTime() < at.getTime()).reverse().slice(0, 12);
  const hour = istHour(at);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // Close to the day: people who have not said yes, and spots someone freed.
  const soon = upcoming.filter((s) => s.start_at.getTime() - at.getTime() < 48 * HOUR_MS);
  const attention = soon.flatMap((s) => {
    const day = fmtWeekday(s.start_at);
    const open = s.slots_needed - s.coming - s.saved - s.waiting;
    return [
      s.waiting > 0 ? `${s.waiting} ${s.waiting === 1 ? "person hasn't" : "people haven't"} confirmed for ${day}. We've reminded them.` : "",
      s.freed > 0 && open > 0 ? `${s.freed} ${s.freed === 1 ? "person" : "people"} freed their spot for ${day}. We're finding someone.` : "",
    ].filter(Boolean);
  });

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl leading-10">{greeting}, {user.name.split(" ")[0]}.</h1>
            <p className="mt-1 flex items-center gap-1.5 text-ink-soft">{org.name}{org.verified_at && <TrustTick className="size-4 [&>svg]:size-3" />}</p>
          </div>
          {sessions.length > 0 && (
            <Link href="/ngo/tasks/new" className={buttonVariants({ size: "tap" })}><Plus aria-hidden />Post a need</Link>
          )}
        </div>

        {attention.length > 0 && (
          <section aria-label="Needs attention" className="mt-5 space-y-1 rounded-xl bg-accent-soft p-4">
            {attention.map((a) => (
              <p key={a} className="flex gap-2 font-medium"><BellRing className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />{a}</p>
            ))}
          </section>
        )}

        {sessions.length === 0 ? (
          <section className="mt-8 rounded-xl bg-card p-6 text-center">
            <EmptyArt />
            <h2 className="mt-3 text-2xl">Your first need takes two minutes.</h2>
            <Link href="/ngo/tasks/new" className={cn(buttonVariants({ size: "tap" }), "mt-4")}>Post a need</Link>
          </section>
        ) : (
          <>
            <section className="mt-7">
              <h2 className="text-2xl">Coming up</h2>
              {upcoming.length === 0 ? (
                <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">Nothing coming up. Post your next need when you&apos;re ready.</p>
              ) : (
                <ul className="mt-3 space-y-3">{upcoming.map((s) => <SessionCard key={s.occurrence_id} s={s} past={false} marking={false} />)}</ul>
              )}
            </section>
            {past.length > 0 && (
              <section className="mt-8">
                <h2 className="text-2xl">Done</h2>
                <ul className="mt-3 space-y-3">
                  {past.map((s) => <SessionCard key={s.occurrence_id} s={s} past marking={canMarkAttendance(s.start_at, at)} />)}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
