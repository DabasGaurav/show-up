// Draws each cause's volunteer to a standalone SVG for the share image (the
// image renderer can't run the illustration component itself). Re-run after
// changing BY_CAUSE in components/art.tsx:  npx tsx scripts/make-cause-art.tsx
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import Peep from "react-peeps";
import { BY_CAUSE } from "@/components/art";

const out: Record<string, string> = {};
for (const { cause, p } of BY_CAUSE) {
  const svg = renderToStaticMarkup(
    <Peep
      style={{ width: 300, height: 300 }}
      {...({ body: p.body, hair: p.hair, face: p.face, facialHair: p.facialHair ?? "None", accessory: p.accessory ?? "None" } as object)}
      strokeColor="#1e1b18"
      viewBox={{ x: "0", y: "0", width: "850", height: "1200" }}
    />,
  ).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  out[cause] = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
fs.writeFileSync("lib/cause-art.json", JSON.stringify(out));
console.log(Object.entries(out).map(([k, v]) => `${k}: ${Math.round(v.length / 1024)} KB`).join("\n"));
