import { ImageResponse } from "next/og";
import { causeUi } from "@/lib/constants";
import { getTaskBySlug } from "@/lib/data/tasks";
import { fmtDayDate, fmtTimeRange } from "@/lib/format";

export const alt = "Show-Up task";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview image: title, date and NGO name (§6.2).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const task = await getTaskBySlug(slug);
  const title = task?.title ?? "Give a few hours. Make them count.";
  const when = task ? `${fmtDayDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)}` : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
          background: "#0f5257", color: "#fbf7f0", padding: 72, fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>{task ? causeUi(task.cause).label : ""}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 28 }}>{when}</div>
          <div style={{ display: "flex", fontSize: 40, marginTop: 8, opacity: 0.85 }}>{task?.org_name ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#f2a541" }}>Show-Up · Save your spot</div>
      </div>
    ),
    size,
  );
}
