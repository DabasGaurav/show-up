import { ImageResponse } from "next/og";
import { getTaskBySlug } from "@/lib/data/tasks";
import { fmtDate, fmtTimeRange } from "@/lib/format";

export const alt = "Show-Up task";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview image: title, date and NGO name (§6.2).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const task = await getTaskBySlug(slug);
  const title = task?.title ?? "Volunteer with Show-Up";
  const when = task ? `${fmtDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)}` : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "#1f3864", color: "#fff", padding: 72, fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>{task?.cause ?? ""}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 28 }}>{when}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 8, opacity: 0.85 }}>{task?.org_name ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>Show-Up · Book your slot</div>
      </div>
    ),
    size,
  );
}
