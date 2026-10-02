import Link from "next/link";

const PAGES = [
  { href: "/demo/explore", title: "Explore", who: "Volunteer · Rohan", note: "Find something and save a spot" },
  { href: "/demo/explore?pick=3", title: "Three similar activities", who: "Volunteer · Rohan", note: "Which NGO would you pick?" },
  { href: "/demo/ngo/annadaan-noida", title: "NGO page", who: "Volunteer · Rohan", note: "Trust tick, stats and reviews" },
  { href: "/demo/home", title: "“Miss it?” card", who: "Volunteer · Aditi", note: "Back after 45 days, in a new city" },
  { href: "/demo/me/get-checked", title: "Get your ID checked", who: "Volunteer", note: "New → Checked → Regular" },
  { href: "/demo/me/standby", title: "Free at short notice", who: "Volunteer", note: "A spot opens up" },
  { href: "/demo/ngo/applicants", title: "People who joined", who: "NGO · Rekha", note: "Five people want to help" },
  { href: "/demo/ngo/standby", title: "Who's coming, with standby", who: "NGO · Rekha", note: "A freed spot gets filled" },
];

export default function DemoIndex() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4">
      <h1 className="text-4xl leading-10">Try Show-Up</h1>
      <p className="mt-2 text-ink-soft">Everything here is sample data. Nothing you do is saved.</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {PAGES.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="block h-full rounded-xl bg-card p-4 hover:ring-2 hover:ring-primary/20">
              <span className="text-sm font-semibold text-primary">{p.who}</span>
              <span className="font-heading mt-1 block text-xl font-semibold">{p.title}</span>
              <span className="text-ink-soft">{p.note}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/demo/reset" className="mt-6 inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-2">Start the demo again</Link>
    </main>
  );
}
