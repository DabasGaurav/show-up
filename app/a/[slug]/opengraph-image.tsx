import { ImageResponse } from "next/og";
import { getActivityBySlug } from "@/lib/data/tasks";
import { fmtDayDate, fmtTimeRange } from "@/lib/format";

export const alt = "An activity on Show-Up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The picture WhatsApp shows with a shared link: title, date and NGO name.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActivityBySlug(slug);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0f5257", color: "#fbf7f0", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>{a?.cause ?? ""}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{a?.title ?? "Give a few hours. Make them count."}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 28 }}>{a ? `${fmtDayDate(a.start_at)} · ${fmtTimeRange(a.start_at, a.end_at)}` : ""}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 8, opacity: 0.85 }}>{a?.org_name ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#f2a541" }}>Show-Up · Save your spot</div>
      </div>
    ),
    size,
  );
}
