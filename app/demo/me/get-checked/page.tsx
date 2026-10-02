import type { Metadata } from "next";
import { LevelMark } from "@/components/kit";
import { GetChecked } from "./get-checked";

export const metadata: Metadata = { title: "Get your ID checked" };

const LEVELS = [
  { level: "new", name: "New", line: "Join any activity that's open to everyone." },
  { level: "verified", name: "Checked", line: "Also join activities with children and in homes." },
  { level: "trusted", name: "Regular", line: "Checked, and came 3 times. First to hear when a spot opens." },
] as const;

export default function DemoGetChecked() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
      <h1 className="text-4xl leading-10">Get your ID checked.</h1>
      <p className="mt-2 text-ink-soft italic">Some NGOs, like those working with children, only accept people who&apos;ve been checked.</p>
      <p className="text-ink-soft italic">It takes 2 minutes.</p>
      <GetChecked />
      <section className="mt-6 rounded-xl bg-card p-5">
        <h2 className="text-2xl">How it builds up</h2>
        <ol className="mt-3 space-y-3">
          {LEVELS.map((l) => (
            <li key={l.level}>
              <p className="flex items-center gap-2 font-semibold">{l.name}<LevelMark level={l.level} /></p>
              <p className="text-ink-soft">{l.line}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
