import { notFound } from "next/navigation";

export type AppMode = "prototype" | "mvp";

export const APP_MODE: AppMode =
  process.env.APP_MODE === "mvp" ? "mvp" : "prototype";

export const isPrototype = APP_MODE === "prototype";
export const isMvp = APP_MODE === "mvp";

export type FeatureId =
  | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9"
  | "F10" | "F11" | "F12" | "F13" | "F14" | "F15" | "F16" | "F17"
  | "LAB" | "MESSAGE_PREVIEW" | "SIMULATED_CLOCK";

// PRD §3 feature table. F18–F26 are not built in either mode.
const FEATURES: Record<FeatureId, Record<AppMode, boolean>> = {
  F1: { prototype: true, mvp: true }, // Task template
  F2: { prototype: true, mvp: true }, // Shareable task card
  F3: { prototype: true, mvp: true }, // Book with phone check
  F4: { prototype: true, mvp: true }, // Confirm-and-release loop
  F5: { prototype: true, mvp: true }, // Attendance marking
  F6: { prototype: true, mvp: true }, // Reliability record (basic)
  F7: { prototype: true, mvp: true }, // Turnout view
  F8: { prototype: true, mvp: false }, // ID verification and trust levels
  F9: { prototype: true, mvp: false }, // One feed with filters
  F10: { prototype: true, mvp: false }, // Verified NGO profile
  F11: { prototype: true, mvp: false }, // Standby cover
  F12: { prototype: true, mvp: false }, // Re-engagement nudges
  F13: { prototype: true, mvp: false }, // No-show consequences (enforced)
  F14: { prototype: true, mvp: false }, // Minimum trust level per task
  F15: { prototype: true, mvp: false }, // Guaranteed response
  F16: { prototype: true, mvp: false }, // Reliability level and verified hours
  F17: { prototype: true, mvp: false }, // Two-way ratings
  LAB: { prototype: true, mvp: false },
  MESSAGE_PREVIEW: { prototype: true, mvp: false },
  SIMULATED_CLOCK: { prototype: true, mvp: false },
};

export function isEnabled(feature: FeatureId, mode: AppMode = APP_MODE): boolean {
  return FEATURES[feature][mode];
}

/** Call at the top of a route: features outside the current mode return 404 (§0.2). */
export function requireFeature(...features: FeatureId[]): void {
  if (!features.every((f) => isEnabled(f))) notFound();
}
