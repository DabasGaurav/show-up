// Display helpers. Times are stored in UTC and shown in IST (PRD §13).
// Pure and safe to import from client components.
import { RECURRENCE, type RecurrenceRule } from "./constants";

const TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts });

const DATE = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const DATE_SHORT = fmt({ weekday: "short", day: "numeric", month: "short" });
const TIME = fmt({ hour: "numeric", minute: "2-digit", hour12: true });
const WEEKDAY = fmt({ weekday: "long" });

export const fmtDate = (d: Date) => DATE.format(d).replace(/, (\d{4})$/, " $1");
export const fmtDateShort = (d: Date) => DATE_SHORT.format(d);
export const fmtTime = (d: Date) => TIME.format(d).replace("am", "AM").replace("pm", "PM");
export const fmtTimeRange = (start: Date, end: Date) => `${fmtTime(start)} – ${fmtTime(end)}`;
export const fmtDateTime = (d: Date) => `${fmtDateShort(d)}, ${fmtTime(d)}`;
export const fmtWeekday = (d: Date) => WEEKDAY.format(d);

/** "2026-11-14" + "10:00" (IST wall clock) → UTC Date. */
export function istToDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${IST_OFFSET}`);
}

/** UTC Date → IST "YYYY-MM-DD" (for date inputs and standby dates). */
export function istDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function istHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)) % 24;
}

export function fmtDuration(min: number): string {
  if (min <= 0 || !Number.isFinite(min)) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} ${h === 1 ? "hour" : "hours"}` : `${h}h ${m}m`;
}

/** "One-off" or e.g. "Every Saturday for 4 weeks". */
export function fmtCommitment(
  commitment: "one_off" | "recurring",
  rule: string | null,
  occurrences: number,
  start: Date,
): string {
  if (commitment === "one_off" || !rule || !(rule in RECURRENCE)) return "One-off";
  const r = rule as RecurrenceRule;
  if (r === "daily") return `Every day for ${occurrences} days`;
  const day = Number.isNaN(start.getTime()) ? "week" : fmtWeekday(start);
  return r === "weekly"
    ? `Every ${day} for ${occurrences} weeks`
    : `Every other ${day}, ${occurrences} sessions`;
}

/** hh:mm:ss or "2 days 4 hours" until a deadline. */
export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} ${d === 1 ? "day" : "days"} ${h} ${h === 1 ? "hour" : "hours"}`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** "Priya Sharma" → "Priya S." (applicant cards, §6.1 Screen 8). */
export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

/** Accepts 10-digit Indian mobiles with or without +91. Returns +91XXXXXXXXXX or null. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export const fmtPhone = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

export function waLink(phone: string | null, text: string): string {
  const to = phone ? phone.replace(/\D/g, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function mapLink(lat: number | null, lng: number | null, address: string | null): string {
  if (lat !== null && lng !== null) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
  }
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address ?? "")}`;
}

/** Great-circle distance in km. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
