import Peep from "react-peeps";
import { causeColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Illustrated people from Open Peeps (CC0), in Show-Up's colours. No photos of real
// people and no NGO logos.

type P = { body: string; hair: string; face: string; facialHair?: string; accessory?: string; bg: string };

const CAST: P[] = [
  { body: "PointingUp", hair: "Bun", face: "SmileBig", bg: "#f2a541" },
  { body: "Shirt", hair: "ShortVolumed", face: "Smile", facialHair: "Chin", bg: "#e3f0ee" },
  { body: "Explaining", hair: "Long", face: "SmileLol", accessory: "GlassRound", bg: "#fdf0dc" },
  { body: "Hoodie", hair: "Turban", face: "Calm", facialHair: "Full", bg: "#0f5257" },
  { body: "Paper", hair: "Hijab", face: "Cute", bg: "#f2a541" },
  { body: "Coffee", hair: "MediumBangs", face: "SmileTeeth", bg: "#e3f0ee" },
];

function One({ p, className }: { p: P; className?: string }) {
  return (
    <span className={cn("block overflow-hidden rounded-full", className)} style={{ background: p.bg }}>
      <Peep
        style={{ width: "100%", height: "100%", display: "block" }}
        // The library's option names are plain strings.
        {...({ body: p.body, hair: p.hair, face: p.face, facialHair: p.facialHair ?? "None", accessory: p.accessory ?? "None" } as object)}
        strokeColor="#1e1b18"
        viewBox={{ x: "0", y: "0", width: "850", height: "1200" }}
      />
    </span>
  );
}

/** Hero: a cluster of friendly faces. */
export function HeroPeeps({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)} role="img" aria-label="Illustrated volunteers">
      {CAST.map((p, i) => <One key={i} p={p} className="aspect-square w-full" />)}
    </div>
  );
}

/** A strip of people on a soft colour: the cover of an activity or an NGO page. */
export function Peeps({ cause, className }: { cause: string; className?: string }) {
  const start = [...(cause || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % CAST.length;
  const picks = [0, 1, 2, 3].map((i) => CAST[(start + i) % CAST.length]);
  return (
    <div className={cn("flex items-end justify-center gap-3 overflow-hidden px-4 pt-4", className)} style={{ background: causeColor(cause) }} aria-hidden>
      {picks.map((p, i) => <One key={i} p={{ ...p, bg: "transparent" }} className="size-28 shrink-0 rounded-none" />)}
    </div>
  );
}

/** Empty states and quiet moments: one friendly face. */
export function OnePeep({ index = 0, className }: { index?: number; className?: string }) {
  return <One p={CAST[index % CAST.length]} className={cn("mx-auto size-28", className)} />;
}
