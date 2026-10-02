import { buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { isPrototype } from "@/lib/flags";
import { cn } from "@/lib/utils";

const FILES = [
  { href: "/admin/export/bookings", title: "Bookings", body: "One row per booking: event, volunteer, status, source, confirm and release times." },
  { href: "/admin/export/events-table", title: "Metrics per event", body: "The table on the Metrics page, with the overall row." },
  { href: "/admin/export/events", title: "Event log", body: "Every analytics event (page views, bookings, releases, filters…)." },
  { href: "/admin/export/volunteers", title: "Volunteers", body: "Reliability record and verified hours per volunteer." },
  { href: "/admin/export/organisations", title: "Organisations", body: "Turnout and verified hours per organisation." },
];

// CSV exports (§6.3): bookings, events and Test Lab sessions.
export default async function ExportPage() {
  if (!(await isAdmin())) return null;
  const files = isPrototype
    ? [...FILES, { href: "/lab/export", title: "Test Lab sessions", body: "Scenario, tester, captured metrics, outcome, answers and quote." }]
    : FILES;
  return (
    <section>
      <h1 className="text-2xl font-bold">Export</h1>
      <p className="mt-1 text-sm text-muted-foreground">CSV files open in Excel or Google Sheets. Times are in UTC.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {files.map((f) => (
          <li key={f.href} className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4">
            <div>
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
            <a href={f.href} className={cn(buttonVariants({ size: "tap", variant: "outline" }), "self-start")}>Download CSV</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
