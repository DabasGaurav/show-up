# Show-Up: Product Requirements Document (Prototype + MVP1)

**Version:** 1.0 · **Owner:** SWPM Team (ISB PGP 2027) · **Build tool:** Codex
**One codebase, two modes:** `APP_MODE=prototype` (all planned screens, sample data, test lab) and `APP_MODE=mvp` (live subset for real events).

---

## 0. How to use this document (read first, Codex)

1. Build **one** web app. A single environment variable switches modes:
   - `prototype`: every screen in §6 works on seeded sample data. No real messages are sent. Includes the **Test Lab** (§9) used to run usability tests for SH1–SH7.
   - `mvp`: only the 7 MVP1 features (§4) are reachable. Uses a real database, real accounts and real notifications, for real events at partner NGOs.
2. Features outside the current mode must be hidden (routes return 404, nav items not rendered), not just disabled.
3. Build in the milestone order in §15. Each milestone must run and deploy before the next starts.
4. Use the exact names, rules and copy in this document. They are referenced in our assignment, so names on screen must match (e.g. "Confirm-and-release", "Turnout view", "Standby cover", "Trusted").
5. All sample NGOs, people and places must be **fictional**. Never use real NGO names, logos or real people.

---

## 1. Product summary

**Problem (from 30 interviews):**
- **NGOs:** 10 of 10 report drop-offs or no-shows without warning. 9 of 10 spend too long recruiting, screening, briefing and chasing. 7 of 10 can't trust unknown volunteers.
- **Volunteers:** 14 of 20 find opportunities scattered and hard to find. 8 of 20 can't tell if an unknown NGO is genuine. 11 of 20 are put off by fixed commitments. 6 of 20 lost their group after moving or graduating, and nothing brought them back.
- **Shared root cause:** neither side has a trusted record of the other, there is no low-guilt way to signal a change of plan, and every match starts from scratch.

**Product:** Show-Up is a two-sided micro-volunteering platform built on trust in both directions.
- NGOs post clearly scoped tasks of any kind: any cause, on-site or online, one-off or recurring.
- Volunteers find tasks with filters, book, confirm 48 hours before, and release with one tap if plans change.
- Released slots go to standby volunteers.
- Every slot updates a reliability record both sides can see. NGOs and volunteers are verified.

**Pitch:** "Genuine tasks you can trust, for volunteers; people who actually turn up, for NGOs."

**Riskiest assumption (what MVP1 tests):** volunteers who book through Show-Up will turn up or release their slot in advance.

**MVP1 success measure:** across at least 3 real events at 2 or more partner NGOs (~40 bookings), **at least 80% of booked slots end in attendance or a release made at least 24 hours before the start**. Today's baseline is about 60%.

---

## 2. Users and personas

| Persona | Who | Core job | What they need from Show-Up |
|---|---|---|---|
| **Volunteer** | Working professionals and students in Indian cities, 20–35, limited and unpredictable time; many are lapsed | Find a genuine opportunity that fits my time and interests, act on it with confidence, and come back after a break | Clear task cards, filters, a verified NGO, easy guilt-free release, a nudge to come back |
| **Lapsed volunteer** | A volunteer with no booking in 30+ days, or who changed city | Restart without hunting again | Re-engagement nudge with matching tasks |
| **NGO coordinator** | Founder or volunteer coordinator of an NGO or community group running sessions and drives | Get volunteers I can trust to turn up, without spending my time recruiting, screening, briefing and chasing | Task template, applicant reliability records, turnout view, standby cover |
| **Team admin** (internal) | Our team, running the Wizard-of-Oz parts in MVP1 | Operate MVP1 and collect data | Admin console: approve NGOs, send reminders, offer standby slots by hand, export metrics |

---

## 3. Feature list (single source of truth)

IDs are used throughout this PRD. "Proto" = present in prototype mode; "MVP1" = present in mvp mode. The list matches the feature table in our assignment exactly.

| ID | Feature | What the user can do | Tests | Priority | Proto | MVP1 |
|---|---|---|---|---|---|---|
| F1 | Task template | NGO turns a need into a scoped task: cause, on-site or online, one-off or recurring, date and time, place or link, role, slots needed, contact, what "done" means (+ minimum trust level in proto) | SH6 | Must | ✅ | ✅ (no trust-level field) |
| F2 | Shareable task card | NGO shares one link; volunteers see a standard task card with every detail | SH1 | Must | ✅ | ✅ |
| F3 | Book with phone check | Volunteer books a slot in one step after confirming their phone | SH3 | Must | ✅ (simulated OTP) | ✅ |
| F4 | Confirm-and-release loop | Confirm 48 hours before, reminders, one-tap release (free until 24 hours before); released slot reopens | SH3 | Must | ✅ | ✅ |
| F5 | Attendance marking | NGO marks each booked volunteer as attended or no-show | SH3 | Must | ✅ | ✅ |
| F6 | Reliability record (basic) | Both sides see attended vs booked, late releases, no-shows | SH3, SH5 | Must | ✅ | ✅ |
| F7 | Turnout view | NGO sees needed / booked / confirmed / unconfirmed / released per slot | SH7 | Must | ✅ | ✅ |
| F8 | ID verification and trust levels | New → Verified (ID checked) → Trusted (3 attended, 0 no-shows) | SH5 | Should | ✅ (simulated) | ❌ |
| F9 | One feed with filters | Browse tasks across NGOs by cause, mode, distance, time, duration, commitment, skill-based | SH1 | Should | ✅ | ❌ |
| F10 | Verified NGO profile | Registration checked, photos, reviews from past volunteers, response rate | SH2 | Should | ✅ | ❌ (basic NGO name and contact only) |
| F11 | Standby cover | "Free at short notice"; released slots offered to matching standby volunteers, first to accept gets it | SH7 | Should | ✅ | ❌ (team does it by hand from admin) |
| F12 | Re-engagement nudges | Lapsed volunteer gets matching tasks after 30 days inactive or a move | SH4 | Should | ✅ | ❌ |
| F13 | No-show consequences | 2 no-shows in 90 days pause Verified-only and Trusted-only tasks for 30 days | SH3 | Should | ✅ (rule shown and simulated) | ❌ (rule text shown, not enforced) |
| F14 | Minimum trust level per task | NGO opens a task to everyone / Verified / Trusted | SH5 | Could | ✅ | ❌ |
| F15 | Guaranteed response | Approval-based tasks: NGO decides within 48 hours or the request auto-releases | SH2 | Could | ✅ | ❌ |
| F16 | Reliability level and verified hours | Volunteer sees level, kept-commitment streak, verified hours | SH3 | Could | ✅ | ❌ |
| F17 | Two-way ratings | NGO rates volunteer and volunteer rates NGO after a slot | SH2, SH5 | Could | ✅ (seeded data; simple rating form) | ❌ |
| F18 | Repeat-volunteer pool | "Invite again": good volunteers get first access | – | Could | ❌ | ❌ |
| F19 | Skill tags | Volunteer skills for skill-based tasks | SH1 | Could | ❌ | ❌ |
| F20 | "Bring friends" booking | Book for 2–3 friends together | SH1 | Could | ❌ | ❌ |
| F21 | Impact note | Thank-you and outcome message after a slot | – | Could | ❌ | ❌ |
| F22 | Bulk certificates | Issue certificates to all attendees | – | Could | ❌ | ❌ |
| F23 | Refundable deposit | Pay a deposit to book | SH3 | Won't | ❌ | ❌ |
| F24 | Paid listing for urgent tasks | NGO pays to show a task first to Trusted volunteers | – | Won't | ❌ | ❌ |
| F25 | Monthly time-saved summary | Founder sees hours saved | – | Won't | ❌ | ❌ |
| F26 | Public leaderboard | Ranking of volunteer hours | – | Won't | ❌ | ❌ |

---

## 4. Scope by mode

### 4.1 Prototype mode (for SH1–SH7 usability tests)
- All features F1–F17, on seeded sample data (§11).
- The nine planned screens (§6.1), plus supporting pages.
- Test Lab (§9) to run scripted scenarios and log results.
- No real SMS, email or WhatsApp; all messages appear in an in-app **Message preview** panel.
- Time can be simulated (a "Now" clock in the Test Lab, so 48-hour and 24-hour windows can be shown instantly).

### 4.2 MVP1 mode (live, real events)
Only F1–F7, plus the admin console.

**Behind the scenes (Wizard of Oz), done by our team through the admin console:**
- **WhatsApp reminders:** the console shows prefilled messages with a `wa.me` click-to-send link per volunteer.
- **Standby cover:** when a slot is released, the admin sees a "Released slots" queue and messages people from a manual standby list.
- **NGO onboarding:** NGOs join with an invite code; the admin approves them.

**Out of MVP1:** the feed, ID verification, trust levels, ratings, nudges, consequences enforcement, payments.

**Volunteers reach tasks only through NGO-shared links** (`/t/{slug}`). There is no public browse page in MVP1.

---

## 5. Business rules (apply in both modes unless noted)

### 5.1 Trust levels (F8; prototype only)
| Level | Requirement | Badge copy |
|---|---|---|
| New | Phone confirmed | "New · phone verified" |
| Verified | New + government ID checked (prototype: upload screen → simulated approval) | "Verified" |
| Trusted | Verified + ≥3 attended slots and 0 no-shows in the last 90 days | "Trusted" |
- A no-show removes Trusted immediately. It can be regained after 3 further attended slots with no no-shows.
- In MVP1 everyone is "New" and no badge is shown, apart from "Phone verified".

### 5.2 Booking
- Each task has `slots_needed`. A volunteer can book if seats remain and (proto) they meet the task's minimum trust level (F14).
- One booking per volunteer per task occurrence.
- Booking requires: name, phone (confirmed), and (MVP1) email for reminders.
- On booking, show the commitment summary and the release rule (copy in §8.3).

### 5.3 Confirm-and-release loop (F4)
Times are relative to the slot start time (IST).
- **T−48h:** booking moves to `awaiting_confirmation`. Send a confirmation message with two actions: **"I'm coming"** and **"Can't make it"**.
- **T−36h:** if still unconfirmed, send a reminder.
- **T−24h:** if still unconfirmed, the booking stays active but shows as **Unconfirmed** (amber) in the turnout view. There is no auto-cancel.
- **T−3h:** send a day-of reminder (place or link, contact, what "done" means).
- **Release:**
  - Before T−24h: an **early release**, which carries no penalty.
  - From T−24h to start: a **late release**, recorded in the reliability record, with no pause.
  - Release is one tap from the booking card or the confirmation message, with an optional reason (Work / Health / Travel / Other).
- The released seat reopens immediately on the task card. In proto it also triggers Standby cover (F11).
- If a booking is made inside 48 hours, it is treated as already confirmed at booking time.

### 5.4 Attendance (F5)
- From slot start until 72h after, the NGO marks each active booking as **Attended** or **No-show**.
- An unmarked booking after 72h is marked **Not recorded** and excluded from metrics.
- An attended booking adds verified hours equal to the slot duration (used by F16).

### 5.5 Reliability record (F6)
Shown on the volunteer's own page and on each applicant card for the NGO:
- **Attended X of Y booked slots.** Y = past bookings that were not early-released.
- **Late releases:** count.
- **No-shows:** count.
- Display string: `Attended 7 of 8 booked slots · 1 late release · 0 no-shows`.
- A new volunteer with no history sees "No slots yet".

### 5.6 No-show consequences (F13)
- Two no-shows in a rolling 90 days pause access to Verified-only and Trusted-only tasks for 30 days. Open tasks can still be booked.
- The rule is shown at booking in both modes. In MVP1 it is not enforced; the rule text is still shown.

### 5.7 Standby cover (F11; proto automatic, MVP1 manual)
- A volunteer switches on **"Free at short notice"** for a date, with city or "online" and preferred causes.
- When a seat is released, offer it to standby volunteers who:
  - match the city (or online) and cause,
  - meet the task's minimum trust level, and
  - are not already booked at that time.
- Order: Trusted first, then Verified, then New.
- An offer lasts 2 hours, or until the task starts if that's sooner. The first to accept gets the seat; others see "This slot has been taken".
- The turnout view shows "Filled by standby".

### 5.8 Guaranteed response (F15; proto)
- Tasks can be **Instant booking** (default) or **Approval required**.
- For approval tasks, the NGO must accept or decline within 48h. Otherwise the request auto-releases and the volunteer is told, with up to 3 similar tasks suggested.
- **Response rate** = % of requests answered within 48h over the last 90 days, shown on the NGO profile.

### 5.9 Re-engagement nudges (F12; proto)
- **Trigger:** no booking for 30 days, OR the volunteer updates their city.
- **Content:** up to 3 upcoming tasks matching saved causes in the current city or online, prioritising NGOs they attended before.
- Shown as an in-app notification card, plus a message preview.

### 5.10 Verified NGO profile (F10; proto)
- **Verification:** registration number entered, 12A/80G optional (prototype: simulated admin approval) → "Verified NGO" badge.
- **Profile shows:** photos, description, causes, city, past-volunteer count, average rating and number of reviews (shown only after ≥3 reviews), and response rate.

### 5.11 Ratings (F17; proto)
- After attendance is marked, both sides can rate 1–5 with optional tags.
- **NGO → volunteer tags:** On time, Prepared, Would invite again.
- **Volunteer → NGO tags:** Well organised, Clear brief, Felt welcome.

---

## 6. Screens

Design for mobile first (360–430px wide), then responsive desktop for the NGO dashboard. All screens use the brand style in §12.

### 6.1 The nine prototype screens (as listed in our assignment)

| # | Screen | Side | Features | Tests |
|---|---|---|---|---|
| 1 | Verify once (phone, then ID) | Volunteer | F3, F8 | SH3, SH5 |
| 2 | Feed with filters | Volunteer | F9 | SH1 |
| 3 | Task card with NGO profile | Volunteer | F2, F10, F15 | SH1, SH2 |
| 4 | Booking, 48-hour confirmation, one-tap release, standby switch | Volunteer | F4, F11, F13 | SH3 |
| 5 | My profile: reliability level, streak, verified hours | Volunteer | F6, F16 | SH3 |
| 6 | Re-engagement nudge | Volunteer | F12 | SH4 |
| 7 | Task template | NGO | F1, F14 | SH6 |
| 8 | Applicant profiles | NGO | F8, F6 | SH5 |
| 9 | Turnout view with standby cover | NGO | F7, F11 | SH7 |

#### Screen 1: Verify once
- **Step A, phone:** enter phone (+91), "Send code", enter a 6-digit OTP. In proto any 6 digits pass, and the code shows in the message preview. Success creates the account at level **New**.
- **Step B, ID (proto only):** "Get Verified to book Verified-only tasks". Choose an ID type (Aadhaar / PAN / Driving licence / Passport), take or upload a photo (no real file is stored in proto; show a placeholder), submit. The status shows "Under review", and the Test Lab can simulate approval, after which the badge becomes **Verified**.
- Explain the levels in one card (New, Verified, Trusted) and what each unlocks.
- A "Skip for now" link is always visible on Step B.

#### Screen 2: Feed with filters
- **Top:** city selector (or "Online"), a search box, and a filter chip row.
- **Filters:**
  - Cause (multi-select): Teaching, Plantation, Food distribution, Animal welfare, Health camps, Elderly care, Disaster relief, Skill-based (design, tech, accounts, content)
  - Mode: On-site / Online
  - Distance: ≤2 km, ≤5 km, ≤10 km (on-site only)
  - Date: Today, This weekend, Pick a date
  - Time of day: Morning / Afternoon / Evening
  - Duration: ≤2h, 2–4h, 4h+
  - Commitment: One-off / Recurring
  - Open to: Everyone / Verified / Trusted (shows a lock if the user is below that level)
- **List items:** compact task cards showing cause icon, title, NGO name with Verified NGO badge, date, time, duration, distance or "Online", seats left, commitment tag, and the minimum-trust tag if any.
- **Empty state:** "No tasks match. Try widening distance or dates", with a button to clear filters.
- **Logging:** events go to the Test Lab when it is active (§9).

#### Screen 3: Task card with NGO profile
- **Header:** task title, cause, NGO name and badge.
- **Standard task card block**, always in this order:
  - Date
  - Start and end time
  - Place (map link) or Online link (shown after booking)
  - Role
  - Duration
  - Commitment (one-off, or recurring: e.g. "Every Saturday for 4 weeks")
  - What "done" means
  - Contact (role name only before booking; phone after booking)
  - Seats left
  - Who can book
- **NGO profile panel:**
  - Verified NGO badge, with a tooltip: "Registration checked by Show-Up"
  - 3 photos
  - About (2 lines)
  - Past volunteers count
  - Rating with review count, and the latest 2 reviews
  - Response rate (e.g. "Replies to 96% of requests within 48 hours")
- **Primary button:** "Book this slot", or "Request to join" for approval tasks.
- **Secondary button:** "Contact NGO". It opens a message sheet, and in proto it logs an event for SH1.

#### Screen 4: Booking, confirmation, release, standby
- **Booking sheet:** a summary of the task, the commitment text, and the release rule (copy §8.3). Then the "Confirm booking" button.
- **Booked state:** a booking card under "My bookings" showing status chips: Booked → Awaiting confirmation → Confirmed / Released / Attended / No-show.
- **48-hour confirmation view** (also reachable by link `/c/{token}`):
  - Large "I'm coming" and "Can't make it" buttons, and the countdown to the free-release deadline.
  - "Can't make it" asks for an optional reason and confirms: "Released. Thanks for telling them early, the NGO can now fill your spot."
- **Standby switch:** a card under My bookings: "Free at short notice?" Pick a date, city or online, and causes. Toggling it on shows "We'll offer you slots that open up".
- **Standby offer card** (proto): "A slot just opened: [task] at [time]. Accept within 2:00:00." Buttons: Accept / Not this time.
- The rule note on no-show consequences (F13) appears in the booking sheet.

#### Screen 5: My profile
- **Level badge:** New, Verified or Trusted, with progress to the next level (e.g. "2 of 3 attended slots to Trusted").
- **Reliability record** (F6 string).
- **Streak:** "5 commitments kept in a row".
- **Verified hours:** total and this year, with a list of past slots and hours.
- **Saved causes and city** (editable; changing city triggers a nudge in proto).
- **Ratings received** (proto): average and tags.

#### Screen 6: Re-engagement nudge
- A notification card at the top of the home screen and in the message preview: "It's been a while! 3 tasks near you match Teaching and Plantation this weekend."
- It lists 3 compact task cards and a "See all" link to the feed, pre-filtered.
- Dismiss and "Not now" are both logged for SH4.

#### Screen 7: Task template (NGO)
- **One page with sections:**
  - What: cause, title, role, what "done" means
  - When: date, start and end, one-off or recurring (repeat rule + number of occurrences)
  - Where: on-site address with map pin, or online link
  - Who: slots needed, minimum trust level (proto), instant or approval
  - Contact: name, role and phone
- **Live preview** of the standard task card on the right (desktop) or under a "Preview" tab (mobile).
- **Validation:** every field except approval mode is required. Warn if "what done means" is shorter than 20 characters.
- **On publish:** show the share link with buttons for copy link, WhatsApp share (`wa.me/?text=` with prefilled text), and Instagram (copy caption).
- **Timer** for SH6 in the Test Lab: from open to publish.

#### Screen 8: Applicant profiles (NGO)
- A list of people who booked or requested a task.
- **Each applicant card:**
  - First name and last initial
  - Level badge
  - Reliability record string
  - Ratings from other NGOs (average and tags)
  - Verified hours
  - Member since
- For approval tasks: Accept / Decline per card, with a countdown to the 48h response deadline.
- The phone number is hidden until the booking is accepted or confirmed.
- **Proto (SH5):** a "5 applicants" scenario with mixed profiles (§11).

#### Screen 9: Turnout view with standby cover (NGO)
- **Per task occurrence**, a header strip: Needed · Booked · Confirmed · Unconfirmed · Released · Filled by standby.
  - Colours: confirmed green, unconfirmed amber, released grey, gaps red.
- A **list of bookings** with a status chip each, and the release time and reason where given.
- **Proto: "Standby cover" panel.** A log of offers sent and accepted for each released seat.
- **MVP1: "Released slots" banner** linking to the admin manual queue (§6.3).
- **After the event:** an attendance marking mode with tap-to-toggle Attended / No-show per person, then "Save attendance".
- **Proto (SH7):** a planning widget: "You need 15 people. How many sign-ups will you aim for?" A numeric input, stored as the tester's answer.

### 6.2 Supporting pages (both modes unless noted)
- **Landing page** (`/`): one-sentence value proposition for NGOs and volunteers, plus "I'm an NGO" and "I want to volunteer" buttons. In MVP1, the volunteer button explains that tasks are shared by partner NGOs.
- **Public task page** (`/t/{slug}`): Screen 3 without the NGO reviews and rating in MVP1. It needs Open Graph tags so WhatsApp shows a rich preview (title, date, NGO name).
- **My bookings** (`/me`): booking cards and the reliability record.
- **NGO dashboard** (`/ngo`): list of tasks (upcoming and past), "New task", and per-task turnout.
- **NGO sign-up** (`/ngo/join`): invite code (MVP1), NGO name, city, causes, contact person, registration number (optional in MVP1).
- **Message preview panel** (proto only): a slide-over panel listing every message the system "sent", with timestamps and the simulated channel (SMS, WhatsApp or email).

### 6.3 Admin console (`/admin`; both modes, team only)
- **NGOs:** approve or reject sign-ups. In proto, also simulate NGO and ID verification approvals.
- **Reminders queue (MVP1):** list of due messages (T−48h confirmation, T−36h reminder, T−3h reminder), each with a `wa.me` link carrying prefilled text, and a "Mark sent" button.
- **Released slots queue (MVP1):** each released seat, with a manual standby list (names and phones entered by the team) and `wa.me` offer links. "Mark filled" assigns a new booking.
- **Metrics:** the MVP1 dashboard (§10).
- **Export:** CSV of bookings, events and Test Lab sessions.

---

## 7. Data model (Postgres / Supabase)

```
users            id, role[volunteer|ngo_member|admin], name, phone, phone_verified_at,
                 email, city, is_online_ok, saved_causes[], level[new|verified|trusted],
                 id_status[none|pending|approved|rejected], created_at, last_active_at
organisations    id, type[ngo|college|company|community], name, slug, city, causes[],
                 registration_no, tax_12a_80g, verified_at, about, photos[], contact_name,
                 contact_phone, invite_code, status[pending|approved|rejected], created_at
org_members      org_id, user_id, role[owner|coordinator]
tasks            id, org_id, title, cause, role, done_definition, mode[onsite|online],
                 address, lat, lng, online_link, start_at, end_at, duration_min,
                 commitment[one_off|recurring], recurrence_rule, occurrences,
                 slots_needed, min_trust[everyone|verified|trusted],
                 booking_mode[instant|approval], contact_name, contact_role,
                 contact_phone, share_slug, status[draft|published|closed], created_at
task_occurrences id, task_id, start_at, end_at            (one row per date for recurring)
bookings         id, occurrence_id, user_id, status[requested|booked|awaiting_confirmation|
                 confirmed|released_early|released_late|attended|no_show|not_recorded|
                 declined|auto_released], source[link|feed|standby|admin],
                 confirm_token, confirmed_at, released_at, release_reason, decided_at,
                 created_at
standby          id, user_id, date, city, is_online, causes[], active
standby_offers   id, booking_released_id, occurrence_id, user_id, sent_at, expires_at,
                 status[sent|accepted|declined|expired|taken]
ratings          id, booking_id, rater_type[ngo|volunteer], score, tags[], created_at
notifications    id, user_id, type, channel[sms|whatsapp|email|in_app], payload,
                 due_at, sent_at, status[queued|sent|manual_pending|manual_sent]
events           id, user_id, session_id, name, props(jsonb), created_at   (analytics)
lab_sessions     id, scenario[SH1..SH7], tester_id, persona, started_at, ended_at,
                 outcome(jsonb), facilitator_notes, quote
```

**Derived values** (views or functions): the reliability record per user, the trust level per user, the NGO response rate, and turnout counts per occurrence.

Use Row Level Security:
- Volunteers see their own bookings.
- NGO members see bookings for their organisation's tasks.
- Phone numbers are revealed only per §6.1 Screen 8.

---

## 8. Notifications and copy

### 8.1 Channels
- **Proto:** all messages go to the Message preview panel only.
- **MVP1:** email is sent automatically (via Resend or similar). WhatsApp messages are produced as `wa.me` links in the admin Reminders queue and sent by hand (Wizard of Oz). SMS OTP goes through Supabase phone auth with an Indian SMS provider. **Fallback:** if no SMS budget, use an email magic link and still collect the phone number (config flag `AUTH_METHOD=sms|email`).

### 8.2 Message templates
| Event | Timing | Text (keep short, plain English) |
|---|---|---|
| Booking confirmed | On booking | "You're booked: {task} with {ngo}, {date} {time}. We'll check in 48 hours before. Plans change? Release free until {deadline}: {link}" |
| Confirmation request | T−48h | "Still on for {task} on {date} at {time}? Tap to confirm or release: {link}" |
| Confirmation reminder | T−36h | "Quick check: are you coming to {task} on {date}? {link}" |
| Day-of reminder | T−3h | "Today: {task} at {time}, {place_or_link}. Contact: {contact}. Done means: {done}" |
| Release receipt | On release | "Released. Thanks for telling {ngo} early, they can now fill your spot." |
| Standby offer (proto) | On release | "A slot just opened: {task}, {date} {time}. First to accept gets it: {link}" |
| Nudge (proto) | Rule §5.9 | "It's been a while! {n} tasks near you match {causes}." |
| NGO: release alert | On release | "{name} released their slot for {task} ({date}). Turnout: {confirmed}/{needed}." |
| NGO: attendance prompt | Slot end | "How did {task} go? Mark attendance: {link}" |

### 8.3 Fixed copy
- **Release rule (booking sheet):** "Plans can change. Release free until 24 hours before. Releasing later or not turning up shows on your reliability record."
- **Consequence rule:** "Two no-shows in 90 days pause access to Verified-only and Trusted-only tasks for 30 days."
- **Trust levels card:** "New: phone verified. Verified: ID checked by Show-Up. Trusted: Verified, plus 3 slots attended with no no-shows."

---

## 9. Test Lab (prototype mode only): runs our solution-hypothesis tests

Route `/lab`, protected by a passcode. It lets a facilitator run each hypothesis test with a real tester and records the evidence for Appendix A.2.

**Start screen:** tester ID (e.g. T-V1, T-N2), persona (Volunteer / Lapsed volunteer / NGO coordinator), and scenario. Starting resets the sample data to the scenario's state and opens the app in tester view. A small floating "End task" button stays visible for the facilitator.

| Scenario | Persona | Task given to tester | Auto-captured | Pass rule (matches assignment) |
|---|---|---|---|---|
| SH1 | Volunteer | "Find and book a task that fits your free time this weekend and a cause you care about." | Time from start to booking; filters used; whether "Contact NGO" was tapped | Booked unaided in <3 min, no "Contact NGO" before booking |
| SH2 | Volunteer | "Choose one of these three tasks and book it." Feed preset to 3 similar tasks, one from an unfamiliar Verified NGO with reviews and response rate, two without | Which task was booked; time; profile panels opened | Books with the unfamiliar verified NGO without asking for a referral |
| SH3 | Volunteer | Tester has a booking. The clock jumps to T−30h and the 48-hour confirmation appears. Script: "Your plans just changed. Do what you'd do." | Action taken (release / confirm / ignore); time to act; reason chosen | Releases the slot (facilitator then records whether they'd do it in real life) |
| SH4 | Lapsed volunteer | Home screen opens with the nudge card. Script: "Here's your phone. Do what you'd normally do." | Nudge opened / dismissed; booked from nudge | Opens the nudge and books a task |
| SH5 | NGO coordinator | "Five people applied for your Saturday food drive. Decide who you'd accept." 5 preset applicants (§11) | Accept or decline per applicant; time; profile details opened | Decides on all five from profiles (facilitator records the screening-call answer) |
| SH6 | NGO coordinator | "Post one of your real upcoming tasks." | Time from open to publish; fields edited; validation errors | Publishes in <5 min (facilitator records the "needs no briefing call?" answer) |
| SH7 | NGO coordinator | "You need 15 people for a drive. Look at this turnout view with standby cover, then tell us how many sign-ups you'd aim for." | Number entered in the planning widget | Enters fewer extra sign-ups than the tester's current practice (facilitator enters current practice) |

**After each scenario,** a facilitator form records:
- outcome (Pass / Fail / Partial)
- answers to the follow-up question for that scenario:
  - SH3: "Would you do this in real life?"
  - SH5: "Would you skip your usual screening call?"
  - SH6: "Does this need a briefing call?"
  - SH7: "How many do you aim for today?"
- one verbatim quote
- notes

**Export:** `/lab/export` downloads a CSV of every session: scenario, tester, persona, captured metrics, outcome, answers, quote. This feeds the Validation status and Evidence columns in the assignment.

---

## 10. MVP1 metrics and analytics

### 10.1 Primary metric
**Show-up-or-early-release rate** = (attended + released_early) ÷ (all bookings for past occurrences, excluding not_recorded).
- **Target:** ≥80%. **Baseline:** ~60%.
- Show it overall, per NGO and per event.

### 10.2 Secondary metrics
- No-show rate
- Late-release rate
- Confirmation rate at T−24h (confirmed ÷ active)
- Median time between release and slot start
- Seats refilled after a release (manual standby)
- NGO-reported time spent chasing (one question in the post-event NGO form: "Minutes spent chasing volunteers for this event")

### 10.3 Event log (both modes)
- **Every mode:** page_view, task_viewed, filter_changed, contact_ngo_tapped, booking_created, confirmation_viewed, booking_confirmed, booking_released, standby_toggled, standby_offer_accepted, nudge_shown, nudge_opened, nudge_dismissed, task_published, applicant_decided, attendance_marked.
- **Proto only:** lab_* events.

### 10.4 Admin metrics page
- Tiles for the primary and secondary metrics.
- A table per event.
- A CSV export.

---

## 11. Seed data (prototype)

All fictional, Indian context.
- **8 NGOs**, across causes, in Delhi NCR, Bengaluru, Pune, Hyderabad and online:
  - "Akshar Learning Circle" (teaching, Delhi)
  - "Hara Bhara Trust" (plantation, Pune)
  - "Annapoorna Food Bank" (food, Bengaluru)
  - "Paws & Care Shelter" (animal welfare, Hyderabad)
  - "Swasthya Saathi" (health camps, Delhi)
  - "Saath Elder Care" (elderly, Bengaluru)
  - "Digital Disha" (skill-based, online)
  - "Neev Community Group" (unverified, new, no reviews; used in SH2)

  Each gets photos (use generated illustrations or neutral stock placeholders, never real logos), ratings and a response rate.
- **30 tasks** over the next 3 weeks:
  - mix of on-site and online, one-off and recurring
  - all minimum trust levels
  - 2h, 3h and 5h durations
  - some nearly full
- **40 volunteers** with varied histories, including all three levels, several with late releases, and two with 2 no-shows (to show the access pause).
- **SH5's five applicants:**
  1. Trusted, 9/9 attended, 4.8★
  2. Verified, 3/4, 1 late release
  3. New, no history
  4. Verified, 5/7, 2 no-shows (paused from Verified-only tasks)
  5. Trusted, 12/12, "Would invite again" ×5
- **The tester's own volunteer account** for volunteer scenarios: level Verified, 2 attended, saved causes Teaching and Plantation, city Delhi NCR. For SH4 it is set to last active 45 days ago.

---

## 12. Design guidelines
- **Tone:** warm, trustworthy, practical. Plain English, short sentences, no jargon.
- **Visual style:** clean cards and generous spacing.
  - Primary colour deep blue (#1F3864, matching our report).
  - Accent green for "confirmed/attended", amber for "unconfirmed", grey for "released", red for gaps or no-shows.
  - Font Inter, or the system UI font.
- **Badges:** consistent shield icons for New, Verified, Trusted and Verified NGO.
- **Accessibility:** tap targets ≥44px, contrast AA, every status shown with text as well as colour.
- **Language:** English. Keep all strings in one file so Hindi can be added later.

---

## 13. Non-functional requirements
- **Performance:** first load <2.5s on mid-range Android over 4G; task pages server-rendered for link previews.
- **Privacy:**
  - Phone numbers are visible only under §6.1 Screen 8 rules.
  - ID images are never stored in prototype; MVP1 does not collect IDs.
  - A simple privacy note sits in the footer.
- **Time:** store UTC, display IST. All scheduled messages are computed from the occurrence start time.
- **Reliability:**
  - Scheduled jobs (Supabase cron or Vercel Cron) run every 15 minutes and are idempotent: a message is never sent twice.
  - The admin queue shows anything overdue.
- **Security:** admin and Test Lab routes need passcode or admin role; RLS on all tables.

---

## 14. Tech stack and deployment
- **Frontend and server:** Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui.
- **Database, auth and storage:** Supabase (Postgres, Auth with phone OTP or email magic link, RLS).
- **Email:** Resend (or similar). **Maps:** OpenStreetMap / Leaflet (no paid keys). Distance by haversine.
- **Hosting:**
  - Vercel, with two deployments from the same repo:
    - `showup-proto.vercel.app`: `APP_MODE=prototype`, seeded database
    - `showup-mvp.vercel.app`: `APP_MODE=mvp`, clean database
  - Exact domain names depend on availability.
- **Repo structure:** `/app` (routes), `/components`, `/lib/rules` (all business rules in §5 as pure, unit-tested functions), `/lib/flags`, `/supabase/migrations`, `/supabase/seed`, `/tests`.
- **Tests:** unit tests for every rule in §5 (release windows, trust levels, reliability record, consequences, standby ordering, response rate); one end-to-end test per Test Lab scenario.

---

## 15. Build milestones (give these to Codex one at a time)
1. **Foundation:** Next.js app, Tailwind, shadcn, Supabase schema (§7), RLS, mode flag, design tokens, landing page.
2. **NGO side core:** NGO join plus admin approval; task template (F1) with live preview; share link with Open Graph; public task page (F2).
3. **Volunteer core:** phone check (F3), booking, My bookings, confirm-and-release loop (F4) with scheduled jobs and the message preview (proto) or email plus the admin WhatsApp queue (MVP1).
4. **Attendance and records:** attendance marking (F5), reliability record (F6), turnout view (F7). → **MVP1 complete; deploy the MVP build.**
5. **Trust layer (proto):** ID verification simulation and trust levels (F8), minimum trust per task (F14), consequences (F13), applicant profiles (Screen 8).
6. **Discovery and NGO trust (proto):** feed with filters (F9), verified NGO profile (F10), guaranteed response (F15), ratings (F17).
7. **Retention and cover (proto):** standby cover (F11), re-engagement nudges (F12), reliability level, streak and hours (F16).
8. **Test Lab (proto):** scenarios SH1–SH7, simulated clock, facilitator forms, CSV export.
9. **Admin metrics and polish:** MVP1 metrics page, exports, accessibility pass, seed data finalised. → **Deploy both builds.**

---

## 16. Acceptance criteria (key)
- **Task posting:** an NGO can post a complete one-off on-site task in under 5 minutes, and the share link shows a rich preview in WhatsApp.
- **Booking:** a volunteer can go from the share link to a confirmed booking in under 1 minute on mobile.
- **Release window:** at T−48h the confirmation appears (proto: instantly via the simulated clock). Release before T−24h is recorded as early; after that, as late.
- **Refill:** a released seat reappears on the task page within 5 seconds.
- **Turnout:** the turnout view counts always equal the sum of booking statuses.
- **Attendance:** after attendance is saved, the volunteer's reliability record updates immediately and matches §5.5.
- **Mode gating:** in `APP_MODE=mvp`, routes for F8–F17 and `/lab` return 404.
- **Lab export:** the CSV contains every lab session with its captured metrics.
- **Seed data:** no real NGO names, logos or people appear anywhere in seed data.

---

## 17. Out of scope (both modes)
Payments, deposits, paid listings, certificates, leaderboards, group bookings, skill tags, impact notes, repeat-volunteer pool, time-saved reports, native mobile apps, languages other than English, and real ID verification integration.

---

## 18. Built to extend later (do not build now; just don't block)
- **Organisations have a `type`** (ngo / college / company / community). The task, booking and reliability models must work for any organisation type, and for volunteers belonging to more than one group.
- **Verified hours and the reliability record must be exportable per volunteer and per organisation** (CSV now; API later).
- **Bookings keep a `source` field**, so we can later see which channel brought each volunteer (link, feed, standby, admin, and future ones).
- **Keep all business rules in `/lib/rules` with config values** (48h, 24h, 90 days, 30 days, 3 slots), so policies can change without a rewrite.
- **Design the task page and the NGO dashboard to support multiple cities** from day one.

---

## 19. What to hand back after the build
1. Two live links: the prototype (with the Test Lab passcode) and MVP1.
2. Screenshots (mobile frame, 390px wide) of:
   - **Prototype:** screens 1–9 (§6.1), the Test Lab start screen, and the message preview.
   - **MVP1:** public task card, booking sheet, 48-hour confirmation with one-tap release, NGO turnout view, attendance marking, reliability record, and the admin reminders queue.
3. The repo link, and the list of Codex prompts used (needed for Appendix A.3).
