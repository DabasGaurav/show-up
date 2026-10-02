// Emails (spec §4): short and warm, and always a real day and time.

export interface Msg {
  title: string;
  ngo: string;
  /** "Saturday" */
  day: string;
  /** "9:00 am" */
  time: string;
}

export const MSG = {
  spotSaved: (m: Msg & { checkInDay: string | null; link: string }) =>
    `You're in for ${m.title} with ${m.ngo} on ${m.day} at ${m.time}. ${m.checkInDay ? `We'll check in on ${m.checkInDay}. ` : ""}Plans change? Free your spot: ${m.link}`,

  stillOn: (m: Msg & { link: string }) =>
    `Still on for ${m.title} this ${m.day} at ${m.time}? One tap lets ${m.ngo} plan: ${m.link}`,

  noReply: (m: Msg & { link: string }) => `Quick one: coming to ${m.title} on ${m.day}? ${m.link}`,

  morningOf: (m: Msg & { placeOrLink: string; contact: string; done: string }) =>
    `Today! ${m.title} at ${m.time}, ${m.placeOrLink}. Ask for ${m.contact}. You're done when: ${m.done}. Thanks for showing up 💛`,

  freedToVolunteer: (m: { ngo: string }) => `All sorted, your spot is free for someone else. Thanks for telling ${m.ngo}.`,

  freedToNgo: (m: { name: string; title: string; reason: string | null; coming: number; needed: number }) =>
    `${m.name} can't make it to ${m.title}${m.reason ? ` (${m.reason})` : ""}. ${m.coming} of ${m.needed} coming.`,

  afterTheDay: (m: { title: string; link: string }) => `How did ${m.title} go? Mark who came, it takes 30 seconds: ${m.link}`,

  comeBack: (m: { list: string }) => `Free this weekend? 3 things near you:\n${m.list}`,

  signInLink: (m: { link: string }) => `Here's your link to Show-Up. It works for 30 minutes: ${m.link}`,
} as const;

export const SUBJECT: Record<string, string> = {
  spot_saved: "You're in",
  still_on: "Still on?",
  no_reply: "Quick one",
  morning_of: "Today!",
  freed_volunteer: "All sorted",
  freed_ngo: "Someone can't make it",
  after_the_day: "Mark who came",
  come_back: "Free this weekend?",
  sign_in: "Your link to Show-Up",
};
