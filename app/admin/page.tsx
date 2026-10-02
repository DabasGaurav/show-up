import type { Metadata } from "next";
import { Pill, Tick } from "@/components/kit";
import { Brand } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { now } from "@/lib/clock";
import { pastStatuses } from "@/lib/data/bookings";
import { listOrgs } from "@/lib/data/orgs";
import { fmtDayDate, fmtPhone } from "@/lib/format";
import { showUpRate } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { decideOrgAction, lockAction } from "./actions";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const TARGET = 80;
const STATUS = { pending: { label: "Waiting for us", tone: "amber" }, approved: { label: "Live", tone: "green" }, rejected: { label: "Rejected", tone: "grey" } } as const;

// Admin: team logins only.
export default async function Admin() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <Brand />
        <h1 className="mt-6 text-3xl">Team only</h1>
        <div className="mt-5 rounded-xl bg-card p-5"><UnlockForm /></div>
      </main>
    );
  }
  const at = await now();
  const [orgs, rate] = await Promise.all([listOrgs(), pastStatuses(at).then(showUpRate)]);
  const met = rate.rate !== null && rate.rate >= TARGET;

  return (
    <>
      <header>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Brand />
          <form action={lockAction}><Button type="submit" variant="ghost" size="tap">Lock</Button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-2">
        <section className="rounded-xl bg-card p-5">
          <p className="text-ink-soft">Came or freed their spot early</p>
          <p className="mt-1 flex flex-wrap items-end gap-3">
            <span className={cn("font-heading text-6xl leading-none font-bold tabular-nums", rate.rate === null ? "text-ink-soft" : met ? "text-ok" : "text-warn")}>{rate.rate === null ? "—" : `${rate.rate}%`}</span>
            <span className="pb-1 text-ink-soft">of all spots · target {TARGET}%</span>
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            {rate.spots === 0
              ? "No past activities yet."
              : `${rate.spots} spots: ${rate.came} came · ${rate.freedEarly} freed early · ${rate.freedLate} freed late · ${rate.didntCome} didn't come`}
          </p>
          {/* A file download, not a page. */}
          <a href="/admin/export" download className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4")}>Export as CSV</a>
        </section>

        <h1 className="mt-8 text-3xl">NGOs</h1>
        {orgs.length === 0 && <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">No NGOs have signed up yet.</p>}
        <ul className="mt-3 space-y-3">
          {orgs.map((o) => (
            <li key={o.id} className="rounded-xl bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xl">{o.name}{o.verified_at && <Tick />}</h2>
                <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{o.city} · {o.causes.join(", ")} · signed up {fmtDayDate(o.created_at)}</p>
              <p className="mt-2 text-sm">
                {o.contact_name}{o.owner_role ? `, ${o.owner_role}` : ""} ·{" "}
                {o.contact_phone ? <a href={`tel:${o.contact_phone}`} className="font-medium text-primary underline underline-offset-2">{fmtPhone(o.contact_phone)}</a> : "no phone"}
                {o.owner_email ? ` · ${o.owner_email}` : ""}
              </p>
              <p className="text-sm text-ink-soft">Registration: {o.registration_no ?? "not given"} · {o.activities} {o.activities === 1 ? "activity" : "activities"}</p>
              {o.about && <p className="mt-1 text-sm">{o.about}</p>}
              <form action={decideOrgAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                {o.status !== "approved" && <Button type="submit" name="decision" value="approve" size="tap">Approve</Button>}
                {o.status !== "rejected" && <Button type="submit" name="decision" value="reject" size="tap" variant="outline">{o.status === "approved" ? "Take offline" : "Reject"}</Button>}
              </form>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
