import { Zap } from "lucide-react";
import { answerOfferAction, clearStandbyAction, setStandbyAction } from "@/app/actions/volunteer";
import { Countdown } from "@/components/countdown";
import { ChipChecks, Field, Select, TextInput } from "@/components/forms/field";
import { Nudge } from "@/components/nudge";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { CAUSES, CITY_NAMES, ONLINE } from "@/lib/constants";
import { listOffersForUser, listStandby } from "@/lib/data/standby";
import { isEnabled } from "@/lib/flags";
import { fmtDateShort, fmtTime, istDateKey } from "@/lib/format";

// Prototype-only cards on My bookings: the re-engagement nudge (F12), standby offers
// and the "Free at short notice?" switch (F11). Renders nothing in MVP1.
export async function MeExtras({ userId, now }: { userId: string; now: Date }) {
  if (!isEnabled("F11") && !isEnabled("F12")) return null;
  const user = await getUser();
  if (!user || user.id !== userId) return null;
  const today = istDateKey(now);
  const [offers, standby] = isEnabled("F11")
    ? await Promise.all([listOffersForUser(userId, now), listStandby(userId, today)])
    : [[], []];

  return (
    <div className="mt-4 space-y-4">
      <Nudge user={user} now={now} />

      {offers.map((o) =>
        o.status === "sent" && o.expires_at.getTime() > now.getTime() ? (
          <section key={o.id} className="rounded-xl border border-ok/30 bg-ok-soft p-4" aria-label="Standby offer">
            <h2 className="flex items-start gap-2 font-semibold text-ok">
              <Zap className="mt-0.5 size-5 shrink-0" aria-hidden />
              A slot just opened: {o.title} at {fmtTime(o.start_at)}.
            </h2>
            <p className="mt-1 text-sm">
              {o.org_name} · {fmtDateShort(o.start_at)} · {o.mode === "online" ? "Online" : [o.address, o.city].filter(Boolean).join(", ")}
            </p>
            <p className="mt-1 text-sm font-medium">
              Accept within <Countdown deadline={o.expires_at.getTime()} serverNow={now.getTime()} />. First to accept gets it.
            </p>
            <form action={answerOfferAction} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="offer_id" value={o.id} />
              <Button type="submit" name="answer" value="accept" size="tap">Accept</Button>
              <Button type="submit" name="answer" value="decline" size="tap" variant="outline" className="bg-card">Not this time</Button>
            </form>
          </section>
        ) : o.status === "taken" ? (
          <p key={o.id} role="status" className="rounded-xl bg-released-soft px-4 py-3 text-sm text-released">
            <strong>This slot has been taken.</strong> {o.title}, {fmtDateShort(o.start_at)}. Thanks for being on standby.
          </p>
        ) : null,
      )}

      {isEnabled("F11") && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Free at short notice?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch on standby for a day. When someone releases a slot, we offer it to you.
          </p>
          {standby.length > 0 && (
            <ul className="mt-3 space-y-2">
              {standby.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-ok-soft px-3 py-2 text-sm">
                  <span>
                    <strong className="text-ok">On standby</strong> · {fmtDateShort(new Date(`${s.date}T12:00:00+05:30`))} · {s.is_online ? "Online" : s.city}
                    {s.causes.length > 0 ? ` · ${s.causes.join(", ")}` : " · any cause"}
                    <span className="block text-xs text-muted-foreground">We&apos;ll offer you slots that open up.</span>
                  </span>
                  <form action={clearStandbyAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" variant="ghost" size="tap">Turn off</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <details className="mt-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand underline underline-offset-2">
              {standby.length > 0 ? "Add another day" : "Switch on standby"}
            </summary>
            <form action={setStandbyAction} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" htmlFor="standby-date">
                  <TextInput id="standby-date" name="date" type="date" min={today} defaultValue={today} required />
                </Field>
                <Field label="Where" htmlFor="standby-where">
                  <Select id="standby-where" name="where" defaultValue={user.city ?? CITY_NAMES[0]}>
                    {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
                    <option>{ONLINE}</option>
                  </Select>
                </Field>
              </div>
              <Field label="Causes" hint="Leave empty for any cause.">
                <ChipChecks name="causes" options={CAUSES} defaultValues={user.saved_causes} />
              </Field>
              <Button type="submit" size="tap" className="w-full">I&apos;m free at short notice</Button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
