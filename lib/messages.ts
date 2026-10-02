// Messages people receive by WhatsApp and email. Wording follows the redesign brief
// (B11): warm, short, and always a real day and time. Pure functions.

export interface MsgTask {
  task: string;
  ngo: string;
  /** "Sat, 12 Oct" */
  date: string;
  /** "9:00 am" */
  time: string;
  /** "Saturday" */
  day: string;
}

export const MSG = {
  // --- B11 ---
  bookingConfirmed: (m: MsgTask & { checkIn: string | null; link: string }) =>
    `You're in for ${m.task} with ${m.ngo} on ${m.date} at ${m.time}. 🙌 ${m.checkIn ? `We'll check in with you on ${m.checkIn}. ` : ""}Plans change? Free up your spot here: ${m.link}`,

  confirmationRequest: (m: MsgTask & { firstName: string; link: string }) =>
    `Hi ${m.firstName}, still on for ${m.task} this ${m.day} at ${m.time}? Tap to let ${m.ngo} know: ${m.link}`,

  confirmationReminder: (m: MsgTask & { link: string }) =>
    `Quick one: are you coming to ${m.task} on ${m.day}? One tap helps ${m.ngo} plan: ${m.link}`,

  dayOfReminder: (m: MsgTask & { placeOrLink: string; contact: string; done: string }) =>
    `Today! ${m.task} at ${m.time}, ${m.placeOrLink}. Ask for ${m.contact}. You're done when: ${m.done}. Thank you for showing up. 💛`,

  releaseReceipt: (m: { ngo: string }) =>
    `All sorted, your spot is free for someone else. Thanks for letting ${m.ngo} know.`,

  ngoReleaseAlert: (m: { name: string; task: string; reason: string | null; coming: number; needed: number }) =>
    `${m.name} can't make it to ${m.task}${m.reason ? ` (${m.reason})` : ""}. ${m.coming} of ${m.needed} coming. We're on it.`,

  ngoAttendancePrompt: (m: { task: string; link: string }) =>
    `How did ${m.task} go? Mark who came, it takes 30 seconds: ${m.link}`,

  // --- Prototype-only features, in the same voice ---
  bookingRequested: (m: MsgTask) =>
    `We've asked ${m.ngo} about ${m.task} on ${m.date}. They'll reply within two days.`,

  requestAccepted: (m: MsgTask & { freeBy: string | null; link: string }) =>
    `Good news: ${m.ngo} would love to have you at ${m.task} on ${m.date} at ${m.time}. ${m.freeBy ? `Plans change? Free up your spot by ${m.freeBy}: ` : "Plans change? Tell them here: "}${m.link}`,

  requestDeclined: (m: MsgTask) =>
    `${m.ngo} has enough people for ${m.task} on ${m.date} this time. Thanks for offering.`,

  requestAutoReleased: (m: MsgTask & { link: string }) =>
    `${m.ngo} hasn't replied about ${m.task}, so we've let it go. Here are some others like it: ${m.link}`,

  standbyOffer: (m: MsgTask & { link: string }) =>
    `A spot just opened! ${m.task}, ${m.date} at ${m.time}. First to say yes gets it: ${m.link}`,

  nudge: (m: { n: number; causes: string }) =>
    `It's been a while! ${m.n} ${m.n === 1 ? "thing" : "things"} near you ${m.n === 1 ? "matches" : "match"} ${m.causes}.`,

  ngoNewRequest: (m: { name: string; task: string; date: string; link: string }) =>
    `${m.name} would like to help with ${m.task} (${m.date}). Say yes or not this time: ${m.link}`,
} as const;

/** Sent by hand over WhatsApp from the admin Reminders queue. */
export const MANUAL_REMINDER_TYPES = ["confirmation_request", "confirmation_reminder", "day_of_reminder"] as const;

export const MESSAGE_LABEL: Record<string, string> = {
  otp: "Sign-in code",
  booking_confirmed: "Spot saved",
  booking_requested: "Asked to join",
  request_accepted: "NGO said yes",
  request_declined: "NGO said not this time",
  request_auto_released: "No reply from the NGO",
  confirmation_request: "Check-in (2 days before)",
  confirmation_reminder: "Gentle nudge",
  day_of_reminder: "Morning of",
  release_receipt: "Spot freed",
  standby_offer: "A spot opened",
  nudge: "Miss it?",
  ngo_release_alert: "To the NGO: spot freed",
  ngo_attendance_prompt: "To the NGO: mark who came",
  ngo_new_request: "To the NGO: someone wants to join",
  volunteer_message: "To the NGO: a question",
};
