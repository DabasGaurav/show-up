import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/site-header";
import { Pill, Tick } from "@/components/kit";
import { Select } from "@/components/forms/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { now } from "@/lib/clock";
import { listAllActivities, listAllSpots, listVolunteers } from "@/lib/data/admin";
import { factsFor, pastStatuses } from "@/lib/data/bookings";
import { listOrgs } from "@/lib/data/orgs";
import { fmtDayDate, fmtPhone, fmtTime } from "@/lib/format";
import { showUpRate, trackRecord } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { decideOrgAction, saveSpotAction, toggleActivityAction, viewAsAction } from "./actions";
import { AdminShell, adminError } from "./shell";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const TARGET = 80;
const STATUS = { pending: { label: "Waiting for us", tone: "amber" }, approved: { label: "Live", tone: "green" }, rejected: { label: "Rejected", tone: "grey" } } as const;
const TABS = [["ngos", "NGOs"], ["activities", "Activities"], ["volunteers", "Volunteers"], ["spots", "Spots"]] as const;
const SPOT_STATUS = [
  ["booked", "Saved"], ["awaiting_confirmation", "Waiting for a yes"], ["confirmed", "Confirmed"], ["released_early", "Freed early"],
  ["released_late", "Freed late"], ["attended", "Came"], ["no_show", "Didn't come"],
] as const;
const small = cn(buttonVariants({ size: "tap", variant: "outline" }), "h-11");
const sample = <Pill tone="grey" className="py-0.5">Launch listing</Pill>;

// Admin: team logins only.
export default async function Admin(props: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <Brand />
        <h1 className="mt-6 text-3xl">Team only</h1>
        <div className="mt-5 rounded-xl bg-card p-5"><UnlockForm /></div>
      </main>
    );
  }
  const sp = await props.searchParams;
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "ngos";
  const at = await now();
  const rate = showUpRate(await pastStatuses(at));
  const met = rate.rate !== null && rate.rate >= TARGET;

  return (
    <AdminShell>
      <section className="rounded-xl bg-card p-5">
        <p className="text-ink-soft">Came or freed their spot early</p>
        <p className="mt-1 flex flex-wrap items-end gap-3">
          <span className={cn("font-heading text-6xl leading-none font-bold tabular-nums", rate.rate === null ? "text-ink-soft" : met ? "text-ok" : "text-warn")}>{rate.rate === null ? "—" : `${rate.rate}%`}</span>
          <span className="pb-1 text-ink-soft">of all spots · target {TARGET}%</span>
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {rate.spots === 0
            ? "No past spots from real sign-ups yet. Launch listings aren't counted."
            : `${rate.spots} spots: ${rate.came} came · ${rate.freedEarly} freed early · ${rate.freedLate} freed late · ${rate.didntCome} didn't come`}
        </p>
        {/* A file download, not a page. */}
        <a href="/admin/export" download className={cn(buttonVariants({ size: "tap", variant: "outline" }), "mt-4")}>Export as CSV</a>
      </section>

      {adminError(sp.e)}
      <nav aria-label="Admin sections" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("flex min-h-11 shrink-0 items-center rounded-full border bg-card px-4 text-sm", tab === k && "border-primary bg-primary-soft font-semibold text-primary")}>{label}</Link>
        ))}
      </nav>

      {tab === "ngos" && <Ngos />}
      {tab === "activities" && <Activities />}
      {tab === "volunteers" && <Volunteers />}
      {tab === "spots" && <Spots />}
    </AdminShell>
  );
}

function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl">{title}</h1>
      {children}
    </div>
  );
}

async function Ngos() {
  const orgs = await listOrgs();
  return (
    <>
      <Heading title="NGOs"><Link href="/admin/ngo/new" className={buttonVariants({ size: "tap" })}>Add NGO</Link></Heading>
      {orgs.length === 0 && <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">No NGOs have signed up yet.</p>}
      <ul className="mt-3 space-y-3">
        {orgs.map((o) => (
          <li key={o.id} className="rounded-xl bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl">{o.name}{o.verified_at && <Tick />}</h2>
              <span className="flex gap-2">{o.is_seed && sample}<Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill></span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{o.city} · {o.causes.join(", ")} · signed up {fmtDayDate(o.created_at)}</p>
            <p className="mt-2 text-sm">
              {o.contact_name}{o.owner_role ? `, ${o.owner_role}` : ""} ·{" "}
              {o.contact_phone ? <a href={`tel:${o.contact_phone}`} className="font-medium text-primary underline underline-offset-2">{fmtPhone(o.contact_phone)}</a> : "no phone"}
              {o.owner_email ? ` · ${o.owner_email}` : ""}
            </p>
            <p className="text-sm text-ink-soft">
              Registration: {o.registration_no ?? "not given"} · {o.activities} {o.activities === 1 ? "activity" : "activities"}
              {o.heard_from ? ` · heard from: ${o.heard_from}` : ""}
            </p>
            {o.about && <p className="mt-1 text-sm">{o.about}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={viewAsAction}>
                <input type="hidden" name="org" value={o.id} />
                <Button type="submit" size="tap" className="h-11">Open dashboard as this NGO</Button>
              </form>
              <Link href={`/admin/activity/new?org=${o.id}`} className={small}>Add activity</Link>
              <Link href={`/admin/ngo/${o.id}`} className={small}>Edit</Link>
              <form action={decideOrgAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={o.id} />
                {o.status !== "approved" && <Button type="submit" name="decision" value="approve" size="tap" variant="outline" className="h-11">Approve</Button>}
                {o.status !== "rejected" && <Button type="submit" name="decision" value="reject" size="tap" variant="outline" className="h-11">{o.status === "approved" ? "Hide" : "Reject"}</Button>}
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Activities() {
  const list = await listAllActivities();
  return (
    <>
      <Heading title="Activities" />
      <p className="mt-1 text-sm text-ink-soft">To add one, use &quot;Add activity&quot; on its NGO.</p>
      {list.length === 0 && <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">No activities yet.</p>}
      <ul className="mt-3 space-y-3">
        {list.map((a) => {
          const when = a.next_at ?? a.first_at;
          return (
            <li key={a.id} className="rounded-xl bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg leading-6">{a.title}</h2>
                <Pill tone={a.status !== "published" ? "grey" : a.next_at ? "green" : "grey"}>{a.status !== "published" ? "Hidden" : a.next_at ? "Live" : "Past"}</Pill>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {a.org_name} · {a.cause} · {a.mode === "online" ? "Online" : a.city} · {fmtDayDate(when)}, {fmtTime(when)}
                {a.dates > 1 ? ` · ${a.dates} dates` : ""} · {a.spots} {a.spots === 1 ? "spot" : "spots"} saved
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={viewAsAction}>
                  <input type="hidden" name="org" value={a.org_id} />
                  <input type="hidden" name="next" value={`/dashboard/a/${a.id}`} />
                  <Button type="submit" size="tap" className="h-11">Who&apos;s coming, as the NGO</Button>
                </form>
                <Link href={`/a/${a.share_slug}`} className={small}>View</Link>
                <Link href={`/admin/activity/${a.id}`} className={small}>Edit</Link>
                <form action={toggleActivityAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="visible" value={a.status === "published" ? "0" : "1"} />
                  <Button type="submit" size="tap" variant="outline" className="h-11">{a.status === "published" ? "Hide" : "Show"}</Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

async function Volunteers() {
  const people = await listVolunteers();
  const facts = await factsFor(people.map((p) => p.id));
  return (
    <>
      <Heading title="Volunteers" />
      {people.length === 0 && <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">Nobody has signed up yet.</p>}
      <ul className="mt-3 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">{p.name}{p.is_seed && sample}</p>
              <p className="text-sm text-ink-soft">{[p.email, p.city, trackRecord(facts.get(p.id) ?? []).text].filter(Boolean).join(" · ")}</p>
            </div>
            <form action={viewAsAction}>
              <input type="hidden" name="user" value={p.id} />
              <Button type="submit" size="tap" variant="outline" className="h-11">Open My plans as {p.name.split(" ")[0]}</Button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}

async function Spots() {
  const spots = await listAllSpots();
  return (
    <>
      <Heading title="Spots" />
      <p className="mt-1 text-sm text-ink-soft">Every saved spot, newest activity first. Change a status, or delete the spot.</p>
      {spots.length === 0 && <p className="mt-3 rounded-xl bg-card p-5 text-ink-soft">No spots saved yet.</p>}
      <ul className="mt-3 space-y-2">
        {spots.map((s) => (
          <li key={s.id} className="rounded-xl bg-card p-4">
            <p className="flex flex-wrap items-center gap-2 font-semibold">{s.user_name}{s.is_seed && sample}</p>
            <p className="text-sm text-ink-soft">{s.title} · {s.org_name} · {fmtDayDate(s.start_at)}, {fmtTime(s.start_at)}</p>
            <form action={saveSpotAction} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={s.id} />
              <label htmlFor={`st-${s.id}`} className="sr-only">Status</label>
              <Select id={`st-${s.id}`} name="status" defaultValue={s.status} className="h-11 w-auto">
                {SPOT_STATUS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </Select>
              <Button type="submit" size="tap" variant="outline" className="h-11">Save</Button>
              <Button type="submit" name="delete" value="1" size="tap" variant="ghost" className="h-11 text-gap">Delete</Button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
