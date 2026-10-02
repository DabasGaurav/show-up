import type { TaskCardData } from "@/components/task-card";
import type { Occurrence, TaskWithOrg } from "@/lib/data/tasks";
import { isEnabled } from "@/lib/flags";
import { fmtCommitment, fmtDayDate, fmtDuration, fmtPhone, fmtTimeRange, fmtWeekday, mapLink } from "@/lib/format";

const WHO: Record<string, string> = {
  everyone: "",
  verified: "For volunteers whose ID we've checked",
  trusted: "For Regulars: checked, and came 3 times",
};

/** Builds the activity details for one date. `confirmed` reveals the link and phone. */
export function taskCardData(task: TaskWithOrg, occ: Occurrence, confirmed: boolean, hosted = 0): TaskCardData {
  return {
    title: task.title,
    cause: task.cause,
    orgName: task.org_name,
    orgVerified: task.org_verified_at !== null,
    hosted,
    date: fmtDayDate(occ.start_at),
    time: fmtTimeRange(occ.start_at, occ.end_at),
    mode: task.mode,
    place: [task.address, task.city].filter(Boolean).join(", "),
    mapUrl: task.mode === "onsite" ? mapLink(task.lat, task.lng, task.address) : undefined,
    onlineLink: confirmed ? task.online_link : null,
    role: task.role,
    duration: fmtDuration(task.duration_min),
    commitment: fmtCommitment(task.commitment, task.recurrence_rule, task.occurrences, task.start_at),
    done: task.done_definition,
    contact: confirmed
      ? `${task.contact_name}, ${task.contact_role} · ${fmtPhone(task.contact_phone)}`
      : `${task.contact_name}, ${task.contact_role} · number shared once you're confirmed`,
    seatsLeft: Math.max(0, task.slots_needed - occ.seats_taken),
    slotsNeeded: task.slots_needed,
    whoCanBook: [
      isEnabled("F14") ? WHO[task.min_trust] : "",
      task.booking_mode === "approval" ? "The NGO says yes to each person" : "",
    ].filter(Boolean).join(" · "),
  };
}

/** Prefilled WhatsApp text for the NGO's group (brief B8). The link is added after it. */
export function shareText(task: TaskWithOrg): string {
  return `We need ${task.slots_needed} ${task.slots_needed === 1 ? "person" : "people"} for ${task.title} on ${fmtWeekday(task.start_at)}, ${fmtDayDate(task.start_at).split(", ")[1]}. Pick a spot here:`;
}

export function shareCaption(task: TaskWithOrg, url: string): string {
  const where = task.mode === "online" ? "Online" : task.city;
  return [
    `Come help: ${task.title}`,
    `${fmtDayDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)} · ${where}`,
    `What you'll do: ${task.role}`,
    `${task.slots_needed} spots. Pick yours: ${url}`,
    `#volunteer #${task.cause.replace(/[^a-z]/gi, "")} #ShowUp`,
  ].join("\n");
}
