// Which routes exist in which mode (PRD §0.2, §16): features outside the current
// mode are hidden, not just disabled. Pure, so the request proxy and tests can use it.

/** Prototype-only routes: F8–F17 and the Test Lab. */
const PROTOTYPE_ONLY = [
  /^\/feed(\/|$)/, // F9
  /^\/verify\/id(\/|$)/, // F8
  /^\/me\/profile(\/|$)/, // F16
  /^\/me\/rate(\/|$)/, // F17
  /^\/standby(\/|$)/, // F11
  /^\/ngo\/tasks\/[^/]+\/applicants(\/|$)/, // F8 applicant profiles
  /^\/admin\/ids(\/|$)/, // F8 simulated ID checks
  /^\/lab(\/|$)/, // Test Lab
  /^\/api\/messages(\/|$)/, // Message preview
];

/** MVP1-only routes: the Wizard-of-Oz queues the prototype automates. */
const MVP_ONLY = [/^\/admin\/reminders(\/|$)/, /^\/admin\/released(\/|$)/];

export function isRouteHidden(pathname: string, mode: "prototype" | "mvp"): boolean {
  return (mode === "mvp" ? PROTOTYPE_ONLY : MVP_ONLY).some((re) => re.test(pathname));
}
