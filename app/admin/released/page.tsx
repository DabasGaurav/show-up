import { Chip } from "@/components/badges";
import { Field, Select, TextInput } from "@/components/forms/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { listReleasedSeats, manualStandby } from "@/lib/data/queues";
import { isMvp } from "@/lib/flags";
import { fmtDate, fmtDateTime, fmtPhone, fmtTime, waLink } from "@/lib/format";
import { MSG } from "@/lib/messages";
import { siteUrl } from "@/lib/site";
import { tick } from "@/lib/tick";
import { cn } from "@/lib/utils";
import { notFound } from "next/navigation";
import { addStandbyPersonAction, fillSeatAction, removeStandbyPersonAction } from "../actions";

// MVP1 Released slots queue: the team offers each released seat to a manual
// standby list over WhatsApp and assigns the booking by hand (§6.3).
export default async function ReleasedSlotsPage() {
  if (!isMvp) notFound(); // the prototype does this automatically (Standby cover, F11)
  if (!(await isAdmin())) return null;
  const at = await tick();
  const [seats, standby, origin] = await Promise.all([listReleasedSeats(at), manualStandby(), siteUrl()]);
  const open = seats.filter((s) => s.seats_taken < s.slots_needed);
  const filled = seats.filter((s) => s.seats_taken >= s.slots_needed);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Released slots</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Offer each open seat to your standby list. When someone says yes, choose them and mark the seat filled.
        </p>
        {open.length === 0 && <p className="mt-4 rounded-xl border bg-card p-5 text-sm">No released seats waiting.</p>}
        <ul className="mt-4 space-y-3">
          {open.map((s) => {
            const offer = MSG.standbyOffer({
              task: s.title, ngo: s.org_name, date: fmtDate(s.start_at), time: fmtTime(s.start_at),
              link: `${origin}/t/${s.share_slug}?o=${s.occurrence_id}`,
            });
            return (
              <li key={s.occurrence_id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{s.title}</h2>
                    <p className="text-sm text-muted-foreground">{s.org_name} · {fmtDateTime(s.start_at)}</p>
                  </div>
                  <Chip tone="red">{s.slots_needed - s.seats_taken} open of {s.slots_needed}</Chip>
                </div>
                <p className="mt-2 text-sm">
                  Released by {s.released_by.join(", ")} · last {fmtDateTime(s.last_released_at)} · refilled so far: {s.fills}
                </p>
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm break-words">{offer}</p>
                {standby.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Add people to the standby list below to offer this seat.</p>
                ) : (
                  <>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {standby.map((p) => (
                        <li key={p.phone}>
                          <a href={waLink(p.phone, offer)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "tap", variant: "outline" }))}>
                            Offer to {p.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                    <form action={fillSeatAction} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="occurrence_id" value={s.occurrence_id} />
                      <Field label="Who accepted?" htmlFor={`fill-${s.occurrence_id}`} className="min-w-48 flex-1">
                        <Select id={`fill-${s.occurrence_id}`} name="phone" required defaultValue="">
                          <option value="" disabled>Choose a person</option>
                          {standby.map((p) => <option key={p.phone} value={p.phone}>{p.name}</option>)}
                        </Select>
                      </Field>
                      <Button type="submit" size="tap">Mark filled</Button>
                    </form>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Manual standby list</h2>
        <p className="mt-1 text-sm text-muted-foreground">People who said they are free at short notice.</p>
        <ul className="mt-3 divide-y rounded-xl border bg-card text-sm">
          {standby.length === 0 && <li className="px-4 py-3 text-muted-foreground">Nobody yet.</li>}
          {standby.map((p) => (
            <li key={p.phone} className="flex items-center justify-between gap-2 px-4 py-1.5">
              <span>{p.name} · {fmtPhone(p.phone)}</span>
              <form action={removeStandbyPersonAction}>
                <input type="hidden" name="phone" value={p.phone} />
                <Button type="submit" variant="ghost" size="tap">Remove</Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addStandbyPersonAction} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Name" htmlFor="sb-name"><TextInput id="sb-name" name="name" required /></Field>
          <Field label="Phone" htmlFor="sb-phone"><TextInput id="sb-phone" name="phone" type="tel" required /></Field>
          <Button type="submit" size="tap" variant="outline">Add</Button>
        </form>
      </section>

      {filled.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Refilled</h2>
          <ul className="mt-3 divide-y rounded-xl border bg-card text-sm">
            {filled.map((s) => (
              <li key={s.occurrence_id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span>{s.title} · {fmtDateTime(s.start_at)}</span>
                <span className="text-muted-foreground">{s.releases} released · {s.fills} refilled</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
