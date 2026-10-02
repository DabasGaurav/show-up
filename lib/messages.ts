// Message templates. The wording follows PRD §8.2 exactly; keep it short and plain.
// Pure functions so they can be unit-tested and reused by the admin queue.

export interface MsgTask {
  task: string;
  ngo: string;
  date: string;
  time: string;
}

export const MSG = {
  bookingConfirmed: (m: MsgTask & { deadline: string; link: string }) =>
    `You're booked: ${m.task} with ${m.ngo}, ${m.date} ${m.time}. We'll check in 48 hours before. Plans change? Release free until ${m.deadline}: ${m.link}`,

  bookingRequested: (m: MsgTask) =>
    `Request sent: ${m.task} with ${m.ngo}, ${m.date} ${m.time}. ${m.ngo} will reply within 48 hours.`,

  requestAccepted: (m: MsgTask & { deadline: string; link: string }) =>
    `${m.ngo} accepted you for ${m.task}, ${m.date} ${m.time}. Plans change? Release free until ${m.deadline}: ${m.link}`,

  requestDeclined: (m: MsgTask) =>
    `${m.ngo} couldn't take you for ${m.task} on ${m.date}. Thanks for offering.`,

  requestAutoReleased: (m: MsgTask & { link: string }) =>
    `${m.ngo} didn't reply within 48 hours, so your request for ${m.task} is released. Similar tasks: ${m.link}`,

  confirmationRequest: (m: MsgTask & { link: string }) =>
    `Still on for ${m.task} on ${m.date} at ${m.time}? Tap to confirm or release: ${m.link}`,

  confirmationReminder: (m: MsgTask & { link: string }) =>
    `Quick check: are you coming to ${m.task} on ${m.date}? ${m.link}`,

  dayOfReminder: (m: MsgTask & { placeOrLink: string; contact: string; done: string }) =>
    `Today: ${m.task} at ${m.time}, ${m.placeOrLink}. Contact: ${m.contact}. Done means: ${m.done}`,

  releaseReceipt: (m: { ngo: string }) =>
    `Released. Thanks for telling ${m.ngo} early, they can now fill your spot.`,

  lateReleaseReceipt: (m: { ngo: string }) =>
    `Released. ${m.ngo} has been told. As this was inside 24 hours, it shows on your reliability record.`,

  standbyOffer: (m: MsgTask & { link: string }) =>
    `A slot just opened: ${m.task}, ${m.date} ${m.time}. First to accept gets it: ${m.link}`,

  nudge: (m: { n: number; causes: string }) =>
    `It's been a while! ${m.n} ${m.n === 1 ? "task" : "tasks"} near you ${m.n === 1 ? "matches" : "match"} ${m.causes}.`,

  ngoReleaseAlert: (m: { name: string; task: string; date: string; confirmed: number; needed: number }) =>
    `${m.name} released their slot for ${m.task} (${m.date}). Turnout: ${m.confirmed}/${m.needed}.`,

  ngoAttendancePrompt: (m: { task: string; link: string }) =>
    `How did ${m.task} go? Mark attendance: ${m.link}`,

  ngoNewRequest: (m: { name: string; task: string; date: string; link: string }) =>
    `${m.name} asked to join ${m.task} (${m.date}). Reply within 48 hours: ${m.link}`,
} as const;

/** Reminder types sent by hand over WhatsApp in MVP1 (admin Reminders queue, §6.3). */
export const MANUAL_REMINDER_TYPES = ["confirmation_request", "confirmation_reminder", "day_of_reminder"] as const;

export const MESSAGE_LABEL: Record<string, string> = {
  otp: "Phone check code",
  booking_confirmed: "Booking confirmed",
  booking_requested: "Request sent",
  request_accepted: "Request accepted",
  request_declined: "Request declined",
  request_auto_released: "Request auto-released",
  confirmation_request: "Confirmation request (T−48h)",
  confirmation_reminder: "Confirmation reminder (T−36h)",
  day_of_reminder: "Day-of reminder (T−3h)",
  release_receipt: "Release receipt",
  standby_offer: "Standby offer",
  nudge: "Re-engagement nudge",
  ngo_release_alert: "NGO: release alert",
  ngo_attendance_prompt: "NGO: attendance prompt",
  ngo_new_request: "NGO: new request",
};
