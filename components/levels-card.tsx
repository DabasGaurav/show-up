import { LevelBadge } from "@/components/badges";

/** Explains the three trust levels and what each unlocks (§6.1 Screen 1). */
export function LevelsCard() {
  const rows = [
    { level: "new", how: "Phone verified.", unlocks: "Book any task open to everyone." },
    { level: "verified", how: "ID checked by Show-Up.", unlocks: "Also book Verified-only tasks." },
    { level: "trusted", how: "Verified, plus 3 slots attended with no no-shows.", unlocks: "Book every task. First in line for standby cover." },
  ] as const;
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Trust levels</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.level} className="text-sm">
            <LevelBadge level={r.level} />
            <p className="mt-1">{r.how}</p>
            <p className="text-muted-foreground">{r.unlocks}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
