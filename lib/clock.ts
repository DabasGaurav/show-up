import "server-only";
import { query, queryOne } from "@/lib/db";
import { isEnabled } from "@/lib/flags";

// The app's "Now". In prototype mode the Test Lab can shift it so the 48-hour
// and 24-hour windows can be shown instantly (PRD §4.1). MVP1 always uses real time.

const KEY = "clock_offset_ms";

export async function clockOffsetMs(): Promise<number> {
  if (!isEnabled("SIMULATED_CLOCK")) return 0;
  const row = await queryOne<{ value: number }>("select value from app_state where key = $1", [KEY]);
  return typeof row?.value === "number" ? row.value : 0;
}

export async function now(): Promise<Date> {
  return new Date(Date.now() + (await clockOffsetMs()));
}

export async function setNow(target: Date | null): Promise<void> {
  if (!isEnabled("SIMULATED_CLOCK")) return;
  const offset = target ? target.getTime() - Date.now() : 0;
  await query(
    `insert into app_state (key, value) values ($1, $2::jsonb)
     on conflict (key) do update set value = excluded.value`,
    [KEY, JSON.stringify(offset)],
  );
}

/** Real wall-clock time, for measuring how long a tester takes (never simulated). */
export function wallClockMs(): number {
  return Date.now();
}
