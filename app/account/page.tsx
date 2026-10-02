import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/signin/actions";
import { Avatar, Pill, TrackDots } from "@/components/kit";
import { Header } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { listSpotsForUser } from "@/lib/data/bookings";
import { getOrgForUser } from "@/lib/data/orgs";
import { ACTIVE, trackRecord } from "@/lib/rules";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { AccountForm } from "./form";

export const metadata: Metadata = { title: "My account" };

const since = (d: Date) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-background px-2 py-3 text-center">
      <p className="font-heading text-2xl font-bold">{n}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}

// My account: who you are, and your track record.
export default async function Account() {
  const user = await requireUser("/account");
  const at = await tick();
  const [spots, org] = await Promise.all([listSpotsForUser(user.id), getOrgForUser(user.id)]);
  const record = trackRecord(spots.map((s) => ({ status: s.status, startAt: s.start_at })));
  const upcoming = spots.filter((s) => s.start_at.getTime() > at.getTime() && ACTIVE.includes(s.status)).length;
  const share = record.total ? Math.round((record.came / record.total) * 100) : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <h1 className="sr-only">My account</h1>
        <section className="flex items-center gap-4">
          <Avatar name={user.name} className="size-16 text-xl" />
          <div className="min-w-0">
            <p className="font-heading text-3xl leading-9 font-bold">{user.name}</p>
            <p className="text-ink-soft">Volunteer since {since(user.created_at)}{user.city ? ` · ${user.city}` : ""}</p>
          </div>
        </section>

        <section className="mt-5 rounded-xl bg-card p-5" aria-labelledby="record">
          <div className="flex items-center justify-between gap-3">
            <h2 id="record" className="text-2xl">Track record</h2>
            {share !== null && <Pill tone={share >= 80 ? "green" : "amber"}>{share}% came</Pill>}
          </div>
          {record.empty ? (
            <p className="mt-2 text-ink-soft">Your first activity starts your track record.</p>
          ) : (
            <TrackDots record={record} className="mt-3 text-base" />
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat n={record.came} label="Came" />
            <Stat n={record.freedLate} label="Freed late" />
            <Stat n={record.didntCome} label="Didn't come" />
          </div>
          <p className="mt-3 text-sm text-ink-soft">NGOs see this when you join their activities.</p>
          <Link href="/me" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4 w-full")}>
            {upcoming ? `My plans · ${upcoming} coming up` : "My plans"}
          </Link>
        </section>

        {org && (
          <section className="mt-4 rounded-xl bg-card p-5" aria-labelledby="ngo">
            <div className="flex items-center justify-between gap-3">
              <h2 id="ngo" className="text-2xl">Your NGO</h2>
              <Pill tone={org.status === "approved" ? "green" : org.status === "pending" ? "amber" : "grey"}>
                {org.status === "approved" ? "Live" : org.status === "pending" ? "Waiting for our call" : "Not live"}
              </Pill>
            </div>
            <p className="mt-1 font-medium">{org.name}</p>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4 w-full")}>Open dashboard</Link>
          </section>
        )}

        <section className="mt-4 rounded-xl bg-card p-5" aria-labelledby="details">
          <h2 id="details" className="text-2xl">Your details</h2>
          <div className="mt-4">
            <AccountForm d={{ name: user.name, phone: user.phone?.replace("+91", "") ?? "", email: user.email ?? "", city: user.city ?? "", causes: user.saved_causes }} />
          </div>
        </section>

        <form action={signOutAction} className="mt-6 text-center">
          <Button type="submit" variant="ghost" size="tap">Sign out</Button>
        </form>
      </main>
    </>
  );
}
