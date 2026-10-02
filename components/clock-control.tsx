import { Clock } from "lucide-react";
import { TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { clockOffsetMs, now } from "@/lib/clock";
import { fmtDateTime, istDateKey } from "@/lib/format";
import { setClockAction } from "@/app/admin/clock-actions";

/** Prototype "Now" clock: jump time so 48-hour and 24-hour windows show instantly (§4.1). */
export async function ClockControl({ path }: { path: string }) {
  const [at, offset] = await Promise.all([now(), clockOffsetMs()]);
  const istTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Clock className="size-4.5 text-brand" aria-hidden />
        Simulated clock
      </h2>
      <p className="mt-1 text-sm">
        Now: <strong>{fmtDateTime(at)}</strong>{" "}
        <span className="text-muted-foreground">{offset === 0 ? "(real time)" : `(shifted ${Math.round(offset / 36e5)}h from real time)`}</span>
      </p>
      <form action={setClockAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="path" value={path} />
        <TextInput name="at" type="datetime-local" defaultValue={`${istDateKey(at)}T${istTime}`} aria-label="Set Now (IST)" className="w-auto" />
        <Button type="submit" name="op" value="set" size="tap">Set</Button>
        <Button type="submit" name="op" value="+1h" size="tap" variant="outline">+1 hour</Button>
        <Button type="submit" name="op" value="+12h" size="tap" variant="outline">+12 hours</Button>
        <Button type="submit" name="op" value="+1d" size="tap" variant="outline">+1 day</Button>
        <Button type="submit" name="op" value="reset" size="tap" variant="ghost">Reset</Button>
      </form>
    </section>
  );
}
