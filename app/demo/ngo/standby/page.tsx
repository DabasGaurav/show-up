import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { Avatar, Pill, WhoBar } from "@/components/kit";
import { DEMO, demoActivity, demoNow } from "@/lib/demo";
import { fmtDayDate, fmtTimeRange } from "@/lib/format";
import { Planning } from "./planning";

export const metadata: Metadata = { title: "Who's coming" };
export const dynamic = "force-dynamic";

const PILL = { coming: { label: "Coming", tone: "green" }, waiting: { label: "Not heard back", tone: "amber" }, freed: { label: "Freed their spot", tone: "grey" } } as const;

// Who's coming, with standby (brief C5), for Rekha at Annadaan Noida Circle.
export default function DemoNgoStandby() {
  const a = demoActivity("ration-kits", demoNow())!;
  const people = DEMO.whoIsComing as { name: string; status: keyof typeof PILL; standby?: boolean; reason?: string }[];
  const count = (s: string) => people.filter((p) => p.status === s).length;
  // Nine people are listed by name; the rest of the 15 are summarised in the bar.
  const coming = count("coming") + 3;
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
      <h1 className="text-4xl leading-10">{a.title}</h1>
      <p className="mt-2 text-ink-soft">{fmtDayDate(a.startAt)} · {fmtTimeRange(a.startAt, a.endAt)}</p>

      <section className="mt-5 rounded-xl bg-card p-5" aria-label="Who's coming">
        <WhoBar counts={{ needed: 15, coming, waiting: count("waiting"), freed: count("freed") }} />
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 font-medium text-ok">
          <Zap className="size-5 shrink-0" aria-hidden />1 freed their spot → filled from standby in 12 min
        </p>
      </section>

      <Planning />

      <section className="mt-6">
        <h2 className="text-2xl">People</h2>
        <ul className="mt-3 space-y-2">
          {people.map((p) => (
            <li key={p.name} className="flex items-center gap-3 rounded-xl bg-card p-3">
              <Avatar name={p.name} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                {p.standby && <span className="text-sm text-ok">Stepped in from standby</span>}
              </span>
              <Pill tone={PILL[p.status].tone}>{PILL[p.status].label}{p.reason ? ` · ${p.reason}` : ""}</Pill>
            </li>
          ))}
          <li className="rounded-xl bg-muted px-4 py-3 text-ink-soft">and 3 more who are coming</li>
        </ul>
      </section>
    </main>
  );
}
