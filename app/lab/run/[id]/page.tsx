import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isLabUnlocked } from "@/lib/auth";
import { requireFeature } from "@/lib/flags";
import { getSession, scenario } from "@/lib/lab";
import { openTesterViewAction } from "../../actions";

// Facilitator briefing: the script to read aloud, then "Open tester view" starts the timer.
export default async function LabRunPage(props: PageProps<"/lab/run/[id]">) {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) return null;
  const { id } = await props.params;
  const session = await getSession(id);
  if (!session) notFound();
  if (session.ended_at) redirect(`/lab/sessions/${id}`);
  const s = scenario(session.scenario)!;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/lab" className="inline-flex min-h-11 items-center text-sm text-brand underline underline-offset-2">← Test Lab</Link>
      <div>
        <p className="text-sm font-medium text-brand">{s.id} · {session.tester_id} · {session.persona}</p>
        <h1 className="mt-1 text-2xl font-bold">{s.title}</h1>
      </div>
      <section className="rounded-xl border-2 border-brand/30 bg-info-soft p-5">
        <h2 className="text-sm font-semibold text-brand">Read this to the tester</h2>
        <p className="mt-2 text-lg font-medium">“{s.script}”</p>
      </section>
      <dl className="space-y-3 rounded-xl border bg-card p-5 text-sm">
        <div><dt className="font-semibold">Starting state</dt><dd className="mt-0.5">{s.setup} The sample data has been reset.</dd></div>
        <div><dt className="font-semibold">Captured automatically</dt><dd className="mt-0.5">{s.captured}</dd></div>
        <div><dt className="font-semibold">Pass rule</dt><dd className="mt-0.5">{s.passRule}</dd></div>
        {s.followUp && <div><dt className="font-semibold">Ask afterwards</dt><dd className="mt-0.5">“{s.followUp.question}”</dd></div>}
      </dl>
      <form action={openTesterViewAction}>
        <input type="hidden" name="id" value={session.id} />
        <Button type="submit" className="h-14 w-full text-lg">Open tester view</Button>
      </form>
      <p className="text-sm text-muted-foreground">
        The timer starts when you tap the button. Hand the device to the tester. A small “End task” button stays at the bottom-left; tap it when they finish or give up.
      </p>
    </div>
  );
}
