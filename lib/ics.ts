/** A calendar file as a data: link, for "Add to calendar". */
export function icsDataUrl(e: { title: string; start: Date; end: Date; location: string; description: string; url: string }): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Show-Up//EN", "BEGIN:VEVENT",
    `UID:${stamp(e.start)}-${encodeURIComponent(e.title)}@show-up`,
    `DTSTAMP:${stamp(new Date(e.start.getTime() - 864e5))}`,
    `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.location)}`, `DESCRIPTION:${esc(e.description)}`, `URL:${e.url}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
