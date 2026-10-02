import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Field, Select, TextArea, TextInput } from "@/components/forms/field";
import { PlaceField } from "@/components/forms/place-field";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { now } from "@/lib/clock";
import { CAUSES, ONLINE } from "@/lib/constants";
import { ownerOf } from "@/lib/data/admin";
import type { Org } from "@/lib/data/orgs";
import { getActivity } from "@/lib/data/tasks";
import { queryOne } from "@/lib/db";
import { fmtDayDate, fmtTimeRange, istDateKey } from "@/lib/format";
import { deleteActivityAction, saveActivityAction } from "../../actions";
import { AdminShell, adminError } from "../../shell";

export const metadata: Metadata = { title: "Activity · Admin", robots: { index: false } };

// Add an activity for an NGO, or edit one. Same fields as "Post a new activity".
export default async function AdminActivity(props: PageProps<"/admin/activity/[id]">) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await props.params;
  const { e, org: orgParam } = await props.searchParams;
  const isNew = id === "new";
  const a = isNew ? null : await getActivity(id);
  if (!isNew && !a) notFound();
  const orgId = a?.org_id ?? (typeof orgParam === "string" ? orgParam : "");
  const org = /^[0-9a-f-]{36}$/i.test(orgId) ? await queryOne<Org>("select * from organisations where id = $1", [orgId]) : null;
  if (!org) redirect("/admin?tab=activities");
  const owner = await ownerOf(org.id);
  const onlineOnly = org.city === ONLINE;

  return (
    <AdminShell backTo="/admin?tab=activities">
      <h1 className="text-3xl">{isNew ? "Add an activity" : a!.title}</h1>
      <p className="mt-1 text-ink-soft">
        For {org.name}{a ? ` · ${fmtDayDate(a.start_at)}, ${fmtTimeRange(a.start_at, a.end_at)}${a.occurrences > 1 ? ` · weekly × ${a.occurrences}` : ""}` : ""}
      </p>
      {adminError(e)}
      <form action={saveActivityAction} className="mt-5 space-y-4 rounded-xl bg-card p-5">
        <input type="hidden" name="id" value={a?.id ?? ""} />
        <input type="hidden" name="org_id" value={org.id} />
        <Field label="Title" htmlFor="title"><TextInput id="title" name="title" defaultValue={a?.title} maxLength={80} required /></Field>
        <Field label="Cause" htmlFor="cause">
          <Select id="cause" name="cause" defaultValue={a?.cause ?? org.causes[0] ?? ""} required>{CAUSES.map((c) => <option key={c}>{c}</option>)}</Select>
        </Field>
        <Field label="What volunteers will do" htmlFor="role"><TextArea id="role" name="role" defaultValue={a?.role} required /></Field>
        <Field label="You're done when…" htmlFor="done_definition"><TextArea id="done_definition" name="done_definition" defaultValue={a?.done_definition} required /></Field>
        {isNew ? (
          <>
            <Field label="Date" htmlFor="date"><TextInput id="date" name="date" type="date" min={istDateKey(await now())} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_time"><TextInput id="start_time" name="start_time" type="time" required /></Field>
              <Field label="End" htmlFor="end_time"><TextInput id="end_time" name="end_time" type="time" required /></Field>
            </div>
            <Field label="How many weeks?" htmlFor="times" hint="1 for a one-off"><TextInput id="times" name="times" type="number" min={1} max={26} defaultValue={1} className="max-w-32" /></Field>
          </>
        ) : (
          <fieldset className="space-y-3 rounded-xl bg-accent-soft p-4">
            <legend className="font-semibold">Move it (leave empty to keep the dates)</legend>
            <Field label="New first date" htmlFor="date"><TextInput id="date" name="date" type="date" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start" htmlFor="start_time"><TextInput id="start_time" name="start_time" type="time" /></Field>
              <Field label="End" htmlFor="end_time"><TextInput id="end_time" name="end_time" type="time" /></Field>
            </div>
          </fieldset>
        )}
        <Field label="On-site or online" htmlFor="mode">
          <Select id="mode" name="mode" defaultValue={a?.mode ?? (onlineOnly ? "online" : "onsite")}>
            <option value="onsite">On-site</option>
            <option value="online">Online</option>
          </Select>
        </Field>
        <Field label="City (on-site)" htmlFor="city"><PlaceField defaultValue={a && a.mode === "onsite" ? a.city : onlineOnly ? "" : org.city} /></Field>
        <Field label="Address (on-site)" htmlFor="address" optional><TextInput id="address" name="address" defaultValue={a?.address ?? ""} maxLength={160} /></Field>
        <Field label="Link (online)" htmlFor="online_link" optional><TextInput id="online_link" name="online_link" type="url" defaultValue={a?.online_link ?? ""} placeholder="https://" /></Field>
        <Field label="How many people" htmlFor="people"><TextInput id="people" name="people" type="number" min={1} max={500} defaultValue={a?.slots_needed ?? 5} className="max-w-32" required /></Field>
        <Field label="Contact on the day" htmlFor="contact_name"><TextInput id="contact_name" name="contact_name" defaultValue={a?.contact_name ?? org.contact_name ?? owner?.name ?? ""} required /></Field>
        <Field label="Their phone" htmlFor="contact_phone" optional>
          <TextInput id="contact_phone" name="contact_phone" type="tel" inputMode="numeric" defaultValue={(a?.contact_phone ?? org.contact_phone ?? "").replace("+91", "")} />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" name="visible" defaultChecked={a ? a.status === "published" : true} className="size-5 accent-[#0f5257]" />
          Approved now (volunteers can see it)
        </label>
        <Button type="submit" size="tap" className="w-full">{isNew ? "Add activity" : "Save changes"}</Button>
      </form>

      {a && (
        <details className="mt-4 rounded-xl bg-card p-5">
          <summary className="min-h-11 cursor-pointer font-semibold text-gap">Delete this activity</summary>
          <p className="mt-2 text-sm">This also deletes every spot saved on it. It can&apos;t be undone.</p>
          <form action={deleteActivityAction} className="mt-3">
            <input type="hidden" name="id" value={a.id} />
            <Button type="submit" size="tap" variant="outline">Yes, delete it</Button>
          </form>
        </details>
      )}
    </AdminShell>
  );
}
