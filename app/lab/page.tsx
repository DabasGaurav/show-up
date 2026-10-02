import Link from "next/link";
import { Chip } from "@/components/badges";
import { ClockControl } from "@/components/clock-control";
import { buttonVariants } from "@/components/ui/button";
import { isLabUnlocked } from "@/lib/auth";
import { requireFeature } from "@/lib/flags";
import { fmtDateTime } from "@/lib/format";
import { listSessions, SCENARIOS } from "@/lib/lab";
import { cn } from "@/lib/utils";
import { StartForm } from "./start-form";

const TONE = { Pass: "green", Fail: "red", Partial: "amber" } as const;

export default async function LabPage(props: PageProps<"/lab">) {
  requireFeature("LAB");
  if (!(await isLabUnlocked())) return null; // the layout shows the passcode form
  const { saved } = await props.searchParams;
  const sessions = await listSessions();
  return (
    <div className="space-y-8">
      {saved && <p role="status" className="rounded-lg bg-ok-soft px-4 py-3 text-sm font-medium text-ok">Session saved.</p>}

      <section>
        <h1 className="text-2xl font-bold">Test Lab</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Run a scripted scenario with a tester. The app logs what they do; you record the outcome and a quote.
        </p>
        <div className="mt-4 rounded-xl border bg-card p-5">
          <StartForm scenarios={SCENARIOS.map(({ id, persona, title, script, setup }) => ({ id, persona, title, script, setup }))} />
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Sessions ({sessions.length})</h2>
          <a href="/lab/export" className={cn(buttonVariants({ size: "tap", variant: "outline" }))}>Export CSV</a>
        </div>
        {sessions.length === 0 ? (
          <p className="mt-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <ul className="mt-3 divide-y rounded-xl border bg-card">
            {sessions.map((s) => {
              const result = s.outcome.result ?? null;
              return (
                <li key={s.id}>
                  <Link href={s.ended_at ? `/lab/sessions/${s.id}` : `/lab/run/${s.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted">
                    <span className="text-sm">
                      <strong>{s.scenario}</strong> · {s.tester_id} · {s.persona}
                      <span className="block text-xs text-muted-foreground">{fmtDateTime(s.started_at)}</span>
                    </span>
                    {result ? (
                      <Chip tone={TONE[result]}>{result}</Chip>
                    ) : s.ended_at ? (
                      <Chip tone="amber">Needs facilitator form</Chip>
                    ) : (
                      <Chip tone="blue">Not finished</Chip>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ClockControl path="/lab" />

      <section>
        <h2 className="text-lg font-semibold">Scenarios</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b bg-muted text-xs">
              <tr><th className="px-3 py-2">Test</th><th className="px-3 py-2">Persona</th><th className="px-3 py-2">Auto-captured</th><th className="px-3 py-2">Pass rule</th></tr>
            </thead>
            <tbody className="divide-y align-top">
              {SCENARIOS.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-semibold">{s.id}</td>
                  <td className="px-3 py-2">{s.persona}</td>
                  <td className="px-3 py-2">{s.captured}</td>
                  <td className="px-3 py-2">{s.passRule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
