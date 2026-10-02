import { CauseIcon } from "@/components/cause-icon";
import { causeUi } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Illustrations drawn for Show-Up in the marigold and teal palette. People are
// shown doing things: planting, teaching, packing. No real photos, logos or brands.

function Person({ x, y, skin, top, flip, arm = "up" }: { x: number; y: number; skin: string; top: string; flip?: boolean; arm?: "up" | "out" | "down" }) {
  const armPath = arm === "up" ? "M12 34 Q30 20 34 4" : arm === "out" ? "M12 34 Q32 34 44 30" : "M12 34 Q22 46 26 60";
  return (
    <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`}>
      <circle cx="0" cy="8" r="13" fill={skin} />
      <path d="M-13 6 Q-12 -10 2 -8 Q14 -6 13 6 Q4 -2 -13 6Z" fill="#1e1b18" />
      <path d="M-18 30 Q0 16 18 30 L22 84 L-22 84Z" fill={top} />
      <path d={armPath} stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M-12 34 Q-24 46 -22 62" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      <rect x="-20" y="82" width="17" height="46" rx="8" fill="#1e1b18" />
      <rect x="3" y="82" width="17" height="46" rx="8" fill="#1e1b18" />
    </g>
  );
}

/** Hero: a group planting a tree and teaching children. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 360" className={className} role="img" aria-label="Volunteers planting a tree and teaching children">
      <rect x="0" y="0" width="520" height="360" rx="28" fill="#fdf0dc" />
      <circle cx="430" cy="78" r="46" fill="#f2a541" />
      <path d="M0 290 Q130 250 260 286 T520 276 L520 360 L0 360Z" fill="#e3f0ee" />
      <path d="M0 318 Q160 290 320 316 T520 306 L520 360 L0 360Z" fill="#0f5257" opacity=".18" />
      {/* tree being planted */}
      <rect x="150" y="186" width="10" height="100" rx="5" fill="#7a4b2a" />
      <circle cx="155" cy="168" r="44" fill="#2e7d4f" />
      <circle cx="126" cy="190" r="26" fill="#2e7d4f" />
      <circle cx="186" cy="192" r="28" fill="#3d9463" />
      <ellipse cx="155" cy="290" rx="46" ry="10" fill="#7a4b2a" opacity=".5" />
      <Person x={86} y={166} skin="#c98b62" top="#0f5257" arm="out" />
      <Person x={226} y={172} skin="#8d5a3b" top="#f2a541" arm="out" flip />
      {/* board and teacher */}
      <rect x="330" y="150" width="120" height="78" rx="8" fill="#0f5257" />
      <path d="M346 176 h54 M346 194 h82 M346 210 h40" stroke="#fdf0dc" strokeWidth="6" strokeLinecap="round" />
      <Person x={308} y={172} skin="#b97a56" top="#b3432f" arm="up" />
      {/* children */}
      <g transform="translate(392 262) scale(.62)"><Person x={0} y={0} skin="#c98b62" top="#f2a541" arm="up" /></g>
      <g transform="translate(446 266) scale(.58)"><Person x={0} y={0} skin="#8d5a3b" top="#2e7d4f" arm="down" flip /></g>
      <g transform="translate(486 262) scale(.6)"><Person x={0} y={0} skin="#b97a56" top="#0f5257" arm="up" flip /></g>
    </svg>
  );
}

/** Empty states: one friendly figure with a sapling. */
export function EmptyArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={cn("mx-auto h-32 w-auto", className)} aria-hidden>
      <ellipse cx="100" cy="134" rx="78" ry="10" fill="#e3f0ee" />
      <rect x="138" y="84" width="6" height="46" rx="3" fill="#7a4b2a" />
      <circle cx="141" cy="76" r="18" fill="#2e7d4f" />
      <circle cx="154" cy="88" r="11" fill="#3d9463" />
      <g transform="translate(84 40) scale(.7)"><Person x={0} y={0} skin="#c98b62" top="#f2a541" arm="out" /></g>
    </svg>
  );
}

/** Two people packing boxes, for the NGO sections. */
export function PackingArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-label="Volunteers packing food kits together">
      <rect width="420" height="300" rx="28" fill="#e3f0ee" />
      <rect x="60" y="196" width="300" height="16" rx="8" fill="#0f5257" />
      <rect x="150" y="150" width="54" height="46" rx="6" fill="#f2a541" />
      <rect x="212" y="162" width="46" height="34" rx="6" fill="#fdf0dc" stroke="#f2a541" strokeWidth="4" />
      <path d="M150 172 h54 M177 150 v46" stroke="#8a5200" strokeWidth="3" />
      <g transform="translate(108 96) scale(.9)"><Person x={0} y={0} skin="#b97a56" top="#0f5257" arm="out" /></g>
      <g transform="translate(312 100) scale(.9)"><Person x={0} y={0} skin="#c98b62" top="#b3432f" arm="out" flip /></g>
    </svg>
  );
}

/** A volunteer reading with a child, for the volunteer sections. */
export function ReadingArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 300" className={className} role="img" aria-label="A volunteer reading with children">
      <rect width="420" height="300" rx="28" fill="#fdf0dc" />
      <circle cx="340" cy="70" r="34" fill="#f2a541" opacity=".6" />
      <path d="M0 250 Q210 222 420 250 L420 300 L0 300Z" fill="#0f5257" opacity=".16" />
      <g transform="translate(150 96)"><Person x={0} y={0} skin="#8d5a3b" top="#0f5257" arm="out" /></g>
      <path d="M186 124 l44 -10 v34 l-44 10Z" fill="#fff" stroke="#0f5257" strokeWidth="4" />
      <g transform="translate(268 160) scale(.66)"><Person x={0} y={0} skin="#c98b62" top="#f2a541" arm="up" flip /></g>
      <g transform="translate(322 166) scale(.6)"><Person x={0} y={0} skin="#b97a56" top="#2e7d4f" arm="down" flip /></g>
    </svg>
  );
}

/** Cover for an activity when the NGO has no photo: the cause, illustrated. */
export function CauseCover({ cause, className }: { cause: string; className?: string }) {
  const ui = causeUi(cause);
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: ui.color }} role="img" aria-label={`${ui.label} activity`}>
      <svg viewBox="0 0 400 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <circle cx="336" cy="40" r="56" fill="#f2a541" opacity=".55" />
        <path d="M0 140 Q100 108 200 134 T400 120 L400 180 L0 180Z" fill="#0f5257" opacity=".14" />
        <g transform="translate(70 62) scale(.62)"><Person x={0} y={0} skin="#c98b62" top="#0f5257" arm="up" /></g>
        <g transform="translate(128 70) scale(.56)"><Person x={0} y={0} skin="#8d5a3b" top="#f2a541" arm="out" flip /></g>
      </svg>
      <CauseIcon cause={cause} className="absolute right-6 bottom-5 size-12 text-primary/70" />
    </div>
  );
}
