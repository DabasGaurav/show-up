"use server";

import { redirect } from "next/navigation";
import { now } from "@/lib/clock";
import { CAUSES, CITY_NAMES, RECURRENCE } from "@/lib/constants";
import { createTask } from "@/lib/data/tasks";
import { track } from "@/lib/events";
import { isEnabled } from "@/lib/flags";
import { istToDate, normalisePhone } from "@/lib/format";
import { requireOrg } from "@/lib/ngo";

export interface TaskFormState {
  errors?: Record<string, string>;
  message?: string;
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function publishTaskAction(_prev: TaskFormState, form: FormData): Promise<TaskFormState> {
  const { user, org } = await requireOrg("/ngo/tasks/new");
  const f = (k: string) => str(form.get(k));
  const errors: Record<string, string> = {};
  const need = (k: string, label: string, min = 1) => {
    if (f(k).length < min) errors[k] = `Enter ${label}.`;
  };

  // Every field except approval mode is required (§6.1 Screen 7).
  if (!(CAUSES as readonly string[]).includes(f("cause"))) errors.cause = "Choose a cause.";
  need("title", "a title", 4);
  need("role", "the volunteer's role", 2);
  need("done_definition", "what “done” means", 3);

  const start = istToDate(f("date"), f("start_time"));
  const end = istToDate(f("date"), f("end_time"));
  if (Number.isNaN(start.getTime())) errors.date = "Choose a date and start time.";
  else if (start.getTime() <= (await now()).getTime()) errors.date = "Choose a date and time in the future.";
  if (Number.isNaN(end.getTime())) errors.end_time = "Choose an end time.";
  else if (end.getTime() <= start.getTime()) errors.end_time = "The end time must be after the start time.";

  const commitment = f("commitment") === "recurring" ? "recurring" : "one_off";
  const rule = f("recurrence_rule");
  const occurrences = Number(f("occurrences"));
  if (commitment === "recurring") {
    if (!(rule in RECURRENCE)) errors.recurrence_rule = "Choose how often it repeats.";
    if (!Number.isInteger(occurrences) || occurrences < 2 || occurrences > 26) {
      errors.occurrences = "Enter the number of sessions (2 to 26).";
    }
  }

  const mode = f("mode") === "online" ? "online" : "onsite";
  const lat = Number(f("lat"));
  const lng = Number(f("lng"));
  if (mode === "onsite") {
    if (!CITY_NAMES.includes(f("city"))) errors.city = "Choose a city.";
    need("address", "the address", 6);
    if (!f("lat") || !f("lng") || Number.isNaN(lat) || Number.isNaN(lng)) errors.address ??= "Drop a pin on the map.";
  } else if (!/^https?:\/\/\S+\.\S+/.test(f("online_link"))) {
    errors.online_link = "Enter the meeting link, starting with https://";
  }

  const slots = Number(f("slots_needed"));
  if (!Number.isInteger(slots) || slots < 1 || slots > 500) errors.slots_needed = "Enter how many volunteers you need.";

  need("contact_name", "the contact's name", 2);
  need("contact_role", "the contact's role", 2);
  const phone = normalisePhone(f("contact_phone"));
  if (!phone) errors.contact_phone = "Enter a 10-digit Indian mobile number.";

  if (Object.keys(errors).length > 0) {
    await track("lab_validation_error", { fields: Object.keys(errors) }, user.id);
    return { errors, message: "Some details are missing. Check the highlighted fields." };
  }

  // Minimum trust level (F14) and approval mode (F15) exist only in the prototype.
  const minTrust = isEnabled("F14") && ["verified", "trusted"].includes(f("min_trust")) ? f("min_trust") : "everyone";
  const bookingMode = isEnabled("F15") && f("booking_mode") === "approval" ? "approval" : "instant";

  const task = await createTask({
    org_id: org.id,
    title: f("title"),
    cause: f("cause"),
    role: f("role"),
    done_definition: f("done_definition"),
    mode,
    city: mode === "onsite" ? f("city") : org.city,
    address: mode === "onsite" ? f("address") : null,
    lat: mode === "onsite" ? lat : null,
    lng: mode === "onsite" ? lng : null,
    online_link: mode === "online" ? f("online_link") : null,
    start_at: start,
    end_at: end,
    commitment,
    recurrence_rule: commitment === "recurring" ? rule : null,
    occurrences: commitment === "recurring" ? occurrences : 1,
    slots_needed: slots,
    min_trust: minTrust as "everyone" | "verified" | "trusted",
    booking_mode: bookingMode,
    contact_name: f("contact_name"),
    contact_role: f("contact_role"),
    contact_phone: phone!,
  });

  const openedAt = Number(f("opened_at"));
  await track(
    "task_published",
    {
      task_id: task.id,
      // SH6: time from opening the template to publishing.
      seconds_to_publish: openedAt > 0 ? Math.round((Date.now() - openedAt) / 1000) : null,
      fields_edited: f("edited_fields").split(",").filter(Boolean),
    },
    user.id,
  );
  redirect(`/ngo/tasks/${task.id}?published=1`);
}
