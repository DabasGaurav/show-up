import { ImageResponse } from "next/og";
// Each cause's volunteer, drawn to SVG ahead of time by scripts/make-cause-art.tsx.
import ART from "@/lib/cause-art.json";
import { getActivityBySlug, listDates } from "@/lib/data/tasks";
import { dateBlock, fmtTimeRange } from "@/lib/format";

export const alt = "An activity on Show-Up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TINT: Record<string, string> = {
  Teaching: "#dce8f7", Food: "#fde6cf", "Trees & green": "#dcefd9", Animals: "#f3e3d3", Health: "#fbdcdc", Elders: "#e8def5", Skills: "#d9efec",
};

// The picture WhatsApp shows with a shared link: the cause's volunteer, the date, the title and the NGO.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getActivityBySlug(slug);
  const dates = a ? await listDates(a.id) : [];
  const next = dates.find((d) => d.start_at.getTime() > Date.now()) ?? dates[dates.length - 1];
  const when = next ? dateBlock(next.start_at) : null;
  const art = (ART as Record<string, string>)[a?.cause ?? ""] ?? Object.values(ART)[0];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#fbf7f0", color: "#1e1b18", fontFamily: "sans-serif" }}>
        <div style={{ width: 400, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: TINT[a?.cause ?? ""] ?? "#e3f0ee" }}>
          <div style={{ display: "flex", width: 300, height: 300, borderRadius: 150, background: "#fbf7f0", overflow: "hidden" }}>
            <img src={art} width={300} height={300} alt="" />
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, fontWeight: 700, color: "#0f5257" }}>{a?.cause ?? "Volunteer"}</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {when && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#f2a541", borderRadius: 28, padding: "14px 30px", marginRight: 28 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{when.dow}</div>
                <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1 }}>{when.day}</div>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{when.mon}</div>
              </div>
            )}
            <div style={{ display: "flex", fontSize: 38, color: "#5c554d" }}>{next ? fmtTimeRange(next.start_at, next.end_at) : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 60, fontWeight: 700, lineHeight: 1.12 }}>{a?.title ?? "Give a few hours. Make them count."}</div>
            <div style={{ display: "flex", fontSize: 36, marginTop: 18, color: "#5c554d" }}>{a?.org_name ?? ""}</div>
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#0f5257" }}>Show-Up · Save your spot</div>
        </div>
      </div>
    ),
    size,
  );
}
