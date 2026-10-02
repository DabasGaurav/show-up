import Link from "next/link";
import Peep from "react-peeps";
import { CauseIcon } from "@/components/cause-icon";
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

// One volunteer per cause: the seven causes cover everything on Show-Up, and no
// activity sits in two of them. The order matches the Cause filter.
const BY_CAUSE: { cause: string; p: Omit<P, "bg"> }[] = [
  { cause: "Teaching", p: { body: "Explaining", hair: "Long", face: "SmileLol", accessory: "GlassRound" } },
  { cause: "Food", p: { body: "Coffee", hair: "Hijab", face: "Cute" } },
  { cause: "Trees & green", p: { body: "PointingUp", hair: "Bun", face: "SmileBig" } },
  { cause: "Animals", p: { body: "FurJacket", hair: "MediumBangs", face: "SmileTeeth" } },
  { cause: "Health", p: { body: "ShirtCoat", hair: "ShortVolumed", face: "Smile", facialHair: "Chin" } },
  { cause: "Elders", p: { body: "Sweater", hair: "Turban", face: "Calm", facialHair: "Full" } },
  { cause: "Skills", p: { body: "Device", hair: "Short", face: "Driven", accessory: "GlassRoundThick" } },
];

/** Hero: one volunteer for each cause. With `links`, each one opens that cause's activities. */
export function HeroPeeps({ className, links = false }: { className?: string; links?: boolean }) {
  return (
    <ul className={cn("flex flex-wrap justify-center gap-x-3 gap-y-4", className)} aria-label="Ways to help">
      {BY_CAUSE.map(({ cause, p }) => {
        const tile = (
          <>
            <span className="relative block">
              <One p={{ ...p, bg: causeColor(cause) }} className="aspect-square w-full" />
              <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-card text-primary shadow-card">
                <CauseIcon cause={cause} className="size-4" />
              </span>
            </span>
            <span className="mt-2 block text-center text-sm leading-5 font-semibold">{cause}</span>
          </>
        );
        return (
          <li key={cause} className="w-[22%]">
            {links ? <Link href={`/?cause=${encodeURIComponent(cause)}`} className="block rounded-xl hover:text-primary">{tile}</Link> : tile}
          </li>
        );
      })}
    </ul>
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
