import { Chip } from "@/components/badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { listReminders } from "@/lib/data/queues";
import { requireFeature } from "@/lib/flags";
import { fmtDateTime, fmtPhone, waLink } from "@/lib/format";
import { MESSAGE_LABEL } from "@/lib/messages";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { markReminderSentAction } from "../actions";

// MVP1 Reminders queue: WhatsApp messages the team sends by hand (Wizard of Oz).
export default async function RemindersPage() {
  requireFeature("F4");
  if (!(await isAdmin())) return null;
  const at = await tick(); // creates anything that has become due
  const all = await listReminders();
  const pending = all.filter((r) => r.status === "manual_pending");
  const sent = all.filter((r) => r.status === "manual_sent").slice(-20).reverse();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Reminders queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap “Open WhatsApp”, send the prefilled message, then mark it sent. Emails go out automatically.
        </p>
        {pending.length === 0 && <p className="mt-4 rounded-xl border bg-card p-5 text-sm">Nothing due. This page refreshes the queue each time it loads.</p>}
        <ul className="mt-4 space-y-3">
          {pending.map((r) => {
            const stale = r.booking_status !== null && !["booked", "awaiting_confirmation", "confirmed"].includes(r.booking_status);
            const overdueMin = Math.round((at.getTime() - r.due_at.getTime()) / 60000);
            return (
              <li key={r.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{r.payload.name ?? "Volunteer"} · {r.payload.to ? fmtPhone(r.payload.to) : "no phone"}</h2>
                    <p className="text-sm text-muted-foreground">{MESSAGE_LABEL[r.type] ?? r.type} · {r.payload.task}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overdueMin > 30 && <Chip tone="red">Overdue {overdueMin >= 120 ? `${Math.round(overdueMin / 60)}h` : `${overdueMin} min`}</Chip>}
                    {stale && <Chip tone="grey">Booking now {r.booking_status?.replace("_", " ")}</Chip>}
                    <Chip tone="amber">Due {fmtDateTime(r.due_at)}</Chip>
                  </div>
                </div>
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm break-words">{r.payload.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={waLink(r.payload.to, r.payload.text)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap" }))}>
                    Open WhatsApp
                  </a>
                  <form action={markReminderSentAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" size="tap" variant="outline">{stale ? "Skip (mark done)" : "Mark sent"}</Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {sent.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Recently sent</h2>
          <ul className="mt-3 divide-y rounded-xl border bg-card text-sm">
            {sent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>{r.payload.name} · {MESSAGE_LABEL[r.type] ?? r.type}</span>
                <span className="text-muted-foreground">{r.sent_at ? fmtDateTime(r.sent_at) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
