/** Minimal CSV writer (RFC 4180). Guards against spreadsheet formula injection. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const cell = (v: unknown): string => {
    let s =
      v === null || v === undefined ? ""
      : v instanceof Date ? v.toISOString()
      : Array.isArray(v) ? v.join("; ")
      : typeof v === "object" ? JSON.stringify(v)
      : String(v);
    if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
