import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Chip } from "@/components/badges";
import { Field, Segmented, Select, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { isLabUnlocked } from "@/lib/auth";
import { requireFeature } from "@/lib/flags";
import { fmtDateTime } from "@/lib/format";
import { getSession, scenario } from "@/lib/lab";
import { saveFormAction } from "../../actions";

const label = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const show = (v: unknown): string =>
  v === null || v === undefined ? "—" : Array.isArray(v) ? (v.length ? v.join("; ") : "None") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);

// Facilitator form after each scenario: outcome, follow-up answer, one verbatim quote, notes.
export default async function LabSessionPage(props: PageProps<"/lab/sessions/[id]">) {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) return null;
  const { id } = await props.params;
  const session = await getSession(id);
  if (!session) notFound();
  if (!session.ended_at) redirect(`/lab/run/${id}`);
  const s = scenario(session.scenario)!;
  const o = session.outcome;
  const result = o.result ?? o.suggested ?? "Partial";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/lab" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">← Test Lab</Link>
      <div>
        <p className="text-sm font-medium text-brand">{s.id} · {session.tester_id} · {session.persona}</p>
        <h1 className="mt-1 text-2xl font-bold">{s.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fmtDateTime(session.started_at)} → {fmtDateTime(session.ended_at)}</p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Captured automatically</h2>
          {o.suggested && <Chip tone={o.suggested === "Pass" ? "green" : o.suggested === "Fail" ? "red" : "amber"}>Suggested: {o.suggested}</Chip>}
        </div>
        <dl className="mt-3 divide-y text-sm">
          {Object.entries(o.captured ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">{label(k)}</dt>
              <dd className="text-right font-medium">{show(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Pass rule: {s.passRule}</p>
      </section>

      <form action={saveFormAction} className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Facilitator form</h2>
        <input type="hidden" name="id" value={session.id} />
        <Field label="Outcome">
          <Segmented name="result" defaultValue={result} options={[{ value: "Pass", label: "Pass" }, { value: "Partial", label: "Partial" }, { value: "Fail", label: "Fail" }]} />
        </Field>
        {s.followUp && (
          <Field label={s.followUp.question} htmlFor="follow_up" hint={s.id === "SH7" ? "Pass if the number they planned in the app is lower than this." : undefined}>
            {s.followUp.type === "number" ? (
              <TextInput id="follow_up" name="follow_up" type="number" inputMode="numeric" min={0} defaultValue={o.answers?.[s.followUp.key] ?? ""} className="max-w-40" />
            ) : (
              <Select id="follow_up" name="follow_up" defaultValue={o.answers?.[s.followUp.key] ?? ""}>
                <option value="">Not asked</option>
                <option>Yes</option>
                <option>No</option>
                <option>Not sure</option>
              </Select>
            )}
          </Field>
        )}
        <Field label="One verbatim quote" htmlFor="quote">
          <TextArea id="quote" name="quote" defaultValue={session.quote ?? ""} maxLength={500} placeholder="In the tester's own words" />
        </Field>
        <Field label="Notes" htmlFor="notes" optional>
          <TextArea id="notes" name="notes" defaultValue={session.facilitator_notes ?? ""} maxLength={2000} />
        </Field>
        <Button type="submit" size="tap" className="w-full">Save session</Button>
      </form>
    </div>
  );
}
