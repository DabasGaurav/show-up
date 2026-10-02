import type { TaskCardData } from "@/components/task-card";
import { MIN_TRUST_LABEL } from "@/lib/constants";
import type { Occurrence, TaskWithOrg } from "@/lib/data/tasks";
import { isEnabled } from "@/lib/flags";
import { fmtCommitment, fmtDate, fmtDuration, fmtPhone, fmtTimeRange, mapLink } from "@/lib/format";

/** Builds the standard task card for one occurrence. `booked` reveals the link and phone. */
export function taskCardData(task: TaskWithOrg, occ: Occurrence, booked: boolean): TaskCardData {
  return {
    title: task.title,
    cause: task.cause,
    orgName: task.org_name,
    orgVerified: isEnabled("F10") && task.org_verified_at !== null,
    date: fmtDate(occ.start_at),
    time: fmtTimeRange(occ.start_at, occ.end_at),
    mode: task.mode,
    place: [task.address, task.city].filter(Boolean).join(", "),
    mapUrl: task.mode === "onsite" ? mapLink(task.lat, task.lng, task.address) : undefined,
    onlineLink: booked ? task.online_link : null,
    role: task.role,
    duration: fmtDuration(task.duration_min),
    commitment: fmtCommitment(task.commitment, task.recurrence_rule, task.occurrences, task.start_at),
    done: task.done_definition,
    contact: booked
      ? `${task.contact_name} (${task.contact_role}) · ${fmtPhone(task.contact_phone)}`
      : `${task.contact_role} · phone shown after booking`,
    seatsLeft: Math.max(0, task.slots_needed - occ.seats_taken),
    slotsNeeded: task.slots_needed,
    whoCanBook:
      (isEnabled("F14") ? MIN_TRUST_LABEL[task.min_trust] : "Anyone with a verified phone") +
      (task.booking_mode === "approval" ? " · NGO approves each request" : ""),
  };
}

export function shareText(task: TaskWithOrg): string {
  return `Volunteer with ${task.org_name}: ${task.title}, ${fmtDate(task.start_at)}, ${fmtTimeRange(task.start_at, task.end_at)}. Book your slot:`;
}

export function shareCaption(task: TaskWithOrg, url: string): string {
  const where = task.mode === "online" ? "Online" : task.city;
  return [
    `Volunteers needed: ${task.title}`,
    `${fmtDate(task.start_at)} · ${fmtTimeRange(task.start_at, task.end_at)} · ${where}`,
    `Role: ${task.role}`,
    `${task.slots_needed} slots. Book in one step: ${url}`,
    `#volunteer #${task.cause.replace(/[^a-z]/gi, "")} #ShowUp`,
  ].join("\n");
}
