import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChipChecks, Field, Select, TextArea, TextInput } from "@/components/forms/field";
import { PlaceField } from "@/components/forms/place-field";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { CAUSES, HEARD_FROM } from "@/lib/constants";
import { ownerOf } from "@/lib/data/admin";
import { contactRole, type Org } from "@/lib/data/orgs";
import { queryOne } from "@/lib/db";
import { deleteOrgAction, saveOrgAction } from "../../actions";
import { AdminShell, adminError } from "../../shell";

export const metadata: Metadata = { title: "NGO · Admin", robots: { index: false } };

// Add an NGO, or edit one. Same fields as NGO sign-up.
export default async function AdminNgo(props: PageProps<"/admin/ngo/[id]">) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await props.params;
  const { e } = await props.searchParams;
  const isNew = id === "new";
  const org = isNew ? null : /^[0-9a-f-]{36}$/i.test(id) ? await queryOne<Org>("select * from organisations where id = $1", [id]) : null;
  if (!isNew && !org) notFound();
  const [owner, role] = org ? await Promise.all([ownerOf(org.id), contactRole(org.id)]) : [null, ""];
  const local = (p: string | null | undefined) => p?.replace("+91", "") ?? "";

  return (
    <AdminShell backTo="/admin">
      <h1 className="text-3xl">{isNew ? "Add an NGO" : org!.name}</h1>
      {adminError(e)}
      <form action={saveOrgAction} className="mt-5 space-y-4 rounded-xl bg-card p-5">
        <input type="hidden" name="id" value={org?.id ?? ""} />
        <Field label="NGO name" htmlFor="name"><TextInput id="name" name="name" defaultValue={org?.name} required /></Field>
        <Field label="City" htmlFor="city"><PlaceField defaultValue={org?.city} onlineLabel="We work online only" /></Field>
        <Field label="Causes"><ChipChecks name="causes" options={CAUSES} defaultValues={org?.causes} /></Field>
        <Field label="What they do, in a line or two" htmlFor="about" optional><TextArea id="about" name="about" defaultValue={org?.about ?? ""} maxLength={200} /></Field>
        <Field label="Registration number" htmlFor="registration_no" optional><TextInput id="registration_no" name="registration_no" defaultValue={org?.registration_no ?? ""} /></Field>
        <Field label="Coordinator's name" htmlFor="contact_name"><TextInput id="contact_name" name="contact_name" defaultValue={org?.contact_name ?? ""} required /></Field>
        <Field label="Their role" htmlFor="role" optional><TextInput id="role" name="role" defaultValue={role} placeholder="e.g. Founder" /></Field>
        {isNew
          ? <Field label="Their email" htmlFor="email" hint="They sign in with a link sent here"><TextInput id="email" name="email" type="email" required /></Field>
          : <Field label="Their email" htmlFor="email" hint="They sign in with a link sent here. Change it to hand the dashboard over."><TextInput id="email" name="email" type="email" defaultValue={owner?.email ?? ""} /></Field>}
        <Field label="Phone" htmlFor="phone" optional><TextInput id="phone" name="phone" type="tel" inputMode="numeric" defaultValue={local(org?.contact_phone)} /></Field>
        <Field label="WhatsApp, if different" htmlFor="whatsapp" optional><TextInput id="whatsapp" name="whatsapp" type="tel" inputMode="numeric" defaultValue={local(org?.whatsapp_phone)} /></Field>
        <Field label="How did they hear about Show-Up?" htmlFor="heard_from" optional>
          <Select id="heard_from" name="heard_from" defaultValue={org?.heard_from ?? ""}>
            <option value="">Choose one</option>
            {HEARD_FROM.map((h) => <option key={h}>{h}</option>)}
          </Select>
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" name="approved" defaultChecked={org ? org.status === "approved" : true} className="size-5 accent-[#0f5257]" />
          Approved now (live, with the ✓)
        </label>
        <Button type="submit" size="tap" className="w-full">{isNew ? "Add NGO" : "Save changes"}</Button>
      </form>

      {org && (
        <details className="mt-4 rounded-xl bg-card p-5">
          <summary className="min-h-11 cursor-pointer font-semibold text-gap">Delete this NGO</summary>
          <p className="mt-2 text-sm">This also deletes its activities and every spot saved on them. It can&apos;t be undone.</p>
          <form action={deleteOrgAction} className="mt-3">
            <input type="hidden" name="id" value={org.id} />
            <Button type="submit" size="tap" variant="outline">Yes, delete {org.name}</Button>
          </form>
        </details>
      )}
    </AdminShell>
  );
}
