// Every user-facing string lives here so Hindi can be added later (PRD §12).
// Names and fixed copy match the PRD exactly (§0.4, §8.3).

export const S = {
  brand: "Show-Up",
  pitch: "Genuine tasks you can trust, for volunteers; people who actually turn up, for NGOs.",

  landing: {
    eyebrow: "Micro-volunteering built on trust",
    title: "Volunteering where both sides show up.",
    lead: "NGOs post clearly scoped tasks. Volunteers book, confirm 48 hours before, and release with one tap if plans change.",
    ngoCta: "I'm an NGO",
    volunteerCta: "I want to volunteer",
    ngoTitle: "For NGOs",
    ngoPoints: [
      "Turn a need into a clear task in minutes",
      "See who is confirmed before the day",
      "Know each volunteer's reliability record",
    ],
    volunteerTitle: "For volunteers",
    volunteerPoints: [
      "Every detail on one task card",
      "Release free until 24 hours before",
      "Build a record NGOs can trust",
    ],
    howTitle: "How it works",
    steps: [
      { title: "Book", body: "Pick a task, confirm your phone and book a slot in one step." },
      { title: "Confirm", body: "We check in 48 hours before. Tap “I'm coming” or “Can't make it”." },
      { title: "Show up", body: "The NGO marks attendance and your reliability record updates." },
    ],
    mvpVolunteerTitle: "Tasks are shared by our partner NGOs",
    mvpVolunteerBody:
      "Show-Up is in a pilot. To book, open the task link a partner NGO shared with you. Already booked? See your bookings below.",
    myBookings: "My bookings",
    browseTasks: "Browse tasks",
  },

  nav: {
    feed: "Tasks",
    myBookings: "My bookings",
    profile: "My profile",
    ngo: "NGO dashboard",
    admin: "Admin",
    lab: "Test Lab",
    signOut: "Sign out",
  },

  rules: {
    release:
      "Plans can change. Release free until 24 hours before. Releasing later or not turning up shows on your reliability record.",
    consequence:
      "Two no-shows in 90 days pause access to Verified-only and Trusted-only tasks for 30 days.",
    trustLevels:
      "New: phone verified. Verified: ID checked by Show-Up. Trusted: Verified, plus 3 slots attended with no no-shows.",
  },

  badges: {
    new: "New · phone verified",
    verified: "Verified",
    trusted: "Trusted",
    phoneVerified: "Phone verified",
    verifiedNgo: "Verified NGO",
    verifiedNgoTooltip: "Registration checked by Show-Up",
  },

  footer: {
    privacy:
      "Privacy: your phone number is shared with an NGO only after your booking is accepted or confirmed. We never sell your data.",
    prototype: "Prototype — sample data. No real messages are sent.",
  },
} as const;
