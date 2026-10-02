# Show-Up: Build Spec (replaces the earlier PRD and redesign brief)

**What we're building:** one simple, launchable micro-volunteering website for Indian cities.
- NGOs post short volunteering activities.
- Volunteers find one that fits their time, save a spot, and either show up or tell the NGO they can't, in one tap.
- Over time, both sides build a track record the other can trust.

**Instructions for Codex**
- **Remove** everything under `/demo`, the app-mode flag, the Test Lab and the manual WhatsApp reminder queue. Then build exactly what's below.
- One app, one database. Every page is real and works end to end.

---

## 1. Who uses it
- **Volunteers:** working professionals and students, 20–35, with a few free hours that change week to week.
- **NGO coordinators:** people who run sessions and drives and are tired of sign-ups who never turn up.
- **Admin:** our team. We approve NGOs before they go live.

---

## 2. Pages

### Volunteer side
1. **Home / Explore** (`/`)
   - Hero: **Give a few hours. Make them count.**
   - Below the hero is a list of upcoming activities, which is the main content.
   - **Filters:**
     - City (Delhi NCR, Bengaluru, Pune, Hyderabad, Jaipur, Mumbai, Online)
     - Cause (Teaching, Food, Trees & green, Animals, Health, Elders, Skills)
     - On-site / Online
     - Date (This weekend / Pick a date)
     - Duration (up to 2h / 2–4h / longer)
     - One-off / Repeats
   - **Each card shows:** date block, title, cause, NGO name with a ✓ if approved, time, place or "Online", and spots left.
   - **Two trust lines under the hero:** "Every NGO is checked by us" · "Your number stays private until you're confirmed".
2. **Activity page** (`/a/{slug}`)
   - Title and NGO name with ✓.
   - **Details:** date and time, place (with map link) or "Online, link sent once confirmed", what you'll do, when you're done, one-off or repeats, spots left, contact person (name only until confirmed).
   - **Sticky button:** **Save my spot**.
   - **Under the button:** "Plans change? Free up your spot by {real day and time}, no questions asked."
3. **Sign in** (when saving a spot)
   - Fields: name, mobile, email.
   - Email magic link (or phone OTP if an SMS provider is set up).
   - One screen, no account page.
4. **My plans** (`/me`)
   - **Upcoming:** status shown as Saved, Waiting for your yes, Confirmed or Freed.
   - **Past:** shown as Came or Didn't come.
   - **Track record card:** dots, plus "Came 7 of 7 times".
   - Each upcoming item has **Yes, I'll be there** (from 2 days before) and **I can't make it**.
5. **Check-in page** (`/c/{token}`), opened from the email
   - Question: **Still on for {day}?**
   - Two big buttons: **Yes, I'll be there** / **I can't make it**. The second has an optional reason (Work / Not well / Travelling / Other).
6. **NGO page** (`/ngo/{slug}`)
   - Name, ✓ "Checked by Show-Up", city, causes and a 2-line about.
   - Stats: "{n} volunteers have joined", "{n} activities run".
   - List of upcoming activities.

### NGO side
7. **NGO sign-up** (`/for-ngos`)
   - Headline: **Spend your time on the cause, not on chasing people.**
   - Form: your name, role, phone, NGO name, city, causes, registration number (optional).
   - After submitting: "Thanks! We'll call you within a day to get you live."
   - The NGO's activities stay hidden until an admin approves it.
8. **Dashboard** (`/dashboard`)
   - **Upcoming activities,** each with a **Who's coming** bar: coming / not heard back / can't make it / still needed.
   - **Past activities,** each with **Mark who came**.
   - Button: **Post a new activity**.
9. **Post an activity** (`/dashboard/new`)
   - Title, cause, what volunteers will do, "you're done when…", date, start and end time, repeats (weekly × n), on-site address or online link, number of people needed, contact on the day (name, phone).
   - Live preview on the side.
   - **After publishing:** a share link with **Share on WhatsApp** (prefilled message) and **Copy link**.
10. **Who's coming** (`/dashboard/a/{id}`)
    - **People list:** name with last initial, status, their track record ("Came 7 of 7 times"), and phone (shown only once they're confirmed).
    - A banner when someone can't make it, with their reason.
    - **After the day:** **Mark who came** (✓ / ✕ per person) → **Save**.

### Admin
11. **Admin** (`/admin`, team logins only)
    - Approve or reject NGOs (approval gives the ✓).
    - **One number on top:** "Came or freed their spot early: {x}% of all spots". Our target is 80%.
    - Export bookings as CSV.

---

## 3. Rules
- **Saving a spot:** allowed if spots are left. One spot per person per activity date.
- **2 days before:** email "Still on for {day}?" with Yes / Can't make it.
- **1.5 days before, no reply:** one gentle reminder.
- **Morning of:** email with the place or link, the contact person and "you're done when".
- **Freeing a spot:**
  - **At least 24 hours before the start:** free, and nothing goes on the record.
  - **Later than that:** "freed late", which shows on the track record.
  - **Either way,** the spot reopens immediately and the NGO gets an email.
- **Mark who came:** the NGO marks Came / Didn't come any time from the start until 3 days after.
- **Track record (shown to the volunteer and to NGOs):** "Came X of Y times" (Y = past spots not freed early), plus the number of late frees and didn't-comes.
- **Come back:** if a volunteer hasn't saved a spot in 30 days, send one email with 3 upcoming activities in their city or online. Then wait another 30 days before sending again.
- **Privacy:** phone numbers are hidden until confirmed. Nothing is sold, and this is said in the footer.

---

## 4. Emails (short and warm)
| When | Text |
|---|---|
| Spot saved | You're in for {title} with {NGO} on {day} at {time}. We'll check in on {check-in day}. Plans change? Free your spot: {link} |
| 2 days before | Still on for {title} this {day} at {time}? One tap lets {NGO} plan: {link} |
| No reply | Quick one: coming to {title} on {day}? {link} |
| Morning of | Today! {title} at {time}, {place or link}. Ask for {contact}. You're done when: {done}. Thanks for showing up 💛 |
| Freed (to volunteer) | All sorted, your spot is free for someone else. Thanks for telling {NGO}. |
| Freed (to NGO) | {Name} can't make it to {title} ({reason}). {coming} of {needed} coming. |
| After the day (to NGO) | How did {title} go? Mark who came, it takes 30 seconds: {link} |
| Come back (30 days) | Free this weekend? 3 things near you: {list} |

---

## 5. Look and feel
- **Colours:**
  - Background warm cream (#FBF7F0), cards white.
  - Text #1E1B18; secondary text #5C564F (never lighter).
  - Buttons deep teal (#0F5257); warm accent marigold (#F2A541).
  - Status: green "coming/came", amber "not heard back", grey "freed", red "didn't come".
- **Fonts:** Fraunces for headings, Inter for everything else.
- **Components:**
  - Rounded cards (16px) with a soft shadow.
  - Pill buttons.
  - A marigold date block on every activity card.
  - Small dots for spots left and for track record.
- **Images:** illustrated people (Open Peeps, recoloured) or royalty-free photos of Indian volunteers. No real NGO logos.
- **Mobile first** (people arrive from WhatsApp links).
- **Words:**
  - No paragraph longer than 2 lines.
  - Never use these words: slot, release, reliability record, micro-volunteering, platform, pilot, demo.
  - Always show real days and times, never "48 hours" or "24 hours".

---

## 6. Content at launch
- **Production starts with real NGOs only.** First to ask:
  - Meenu's Sewa Bharti centre (Delhi)
  - OSSPM's education NGO (Maharashtra)
  - Kavita's community education NGO (Jaipur)
  - the other NGOs our team interviewed

  Their names and activities go live only after they agree.
- **For local testing only,** `npm run seed` loads sample activities based on what our interviewees described:
  - weekend science kits for class 6–8
  - online English classes for a Rajasthan village school
  - leftover-food pickup in Noida
  - packing 200 ration kits
  - a village mela talk on keeping girls in school
  - day-care story time
  - a catalogue design for a women's artisan collective
  - tree planting
  - a blood camp desk

  Sample NGOs get made-up names. Seed data must never be loaded in production.

---

## 7. Not in this version
Ratings and reviews, ID checks, trust levels, standby lists, group booking, certificates, payments, a mobile app, Hindi.

---

## 8. Done when
- A real NGO can sign up, get approved, post an activity and share it on WhatsApp in under 5 minutes.
- A volunteer can go from the shared link, or from the home page, to a saved spot in under 1 minute on a phone.
- The emails in §4 go out at the right times.
- "I can't make it" reopens the spot instantly and emails the NGO.
- **Mark who came** updates the volunteer's track record.
- The admin number in §2.11 is correct.
- It works and looks right at 390px and at 1280px wide.
