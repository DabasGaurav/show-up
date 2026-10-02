# Show-Up: Redesign, Copy and Demo-Mode Brief (for Codex)

This brief **replaces all visual design and all user-facing text** in the current app (`showup-mvp-rosy.vercel.app`).
- **Do not change:** the data model, business rules or routes.
- **Change:** how the app looks and what it says, and add a **demo mode** (Part C).
- Apply it in the order Part A → Part B → Part C.

**The feeling we want:** a warm, trustworthy local community, not a form, a policy page or a startup pitch.
- People should *feel* that NGOs here are real and that volunteers here keep their word, without being told so in long sentences.
- Show trust (faces, ticks, small numbers, privacy promises); don't explain it.
- **Rule of thumb:** no paragraph longer than 2 lines on any screen, and no word a first-time volunteer's parent wouldn't use.

---

## Part A: Visual design

### A1. Direction
- **Warm and human:** cream background, deep teal for actions, marigold for warmth, illustrated people.
- **Feels like:** a neighbourhood noticeboard made beautiful, and a well-run community event.
- **Mobile first** (most people arrive from a WhatsApp link). Desktop is mainly for the NGO dashboard.

### A2. Design tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#FBF7F0` (warm cream) | Page background |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#1E1B18` | Headings, body |
| `--ink-soft` | `#5C564F` | Secondary text (never lighter than this) |
| `--primary` | `#0F5257` (deep teal) | Main buttons, links, ticks |
| `--primary-soft` | `#E3F0EE` | Selected chips, info strips |
| `--accent` | `#F2A541` (marigold) | Highlights, date blocks, illustrations |
| `--accent-soft` | `#FDF0DC` | Warm banners |
| `--success` | `#2E7D4F` | "Coming", "Came" |
| `--warn` | `#C77700` | "Not heard back" |
| `--muted` | `#9A938A` | "Freed their spot" |
| `--danger` | `#B3432F` | "Didn't come", gaps |
| Radius | 16px cards, 999px chips and buttons | |
| Shadow | `0 1px 2px rgba(30,27,24,.06), 0 8px 24px rgba(30,27,24,.06)` | Cards only |

- **Fonts:** **Fraunces** (headings: warm serif, weights 600–700) and **Inter** (everything else), both from Google Fonts.
- **Sizes:** H1 36/40 on mobile, 52/56 on desktop. Body 16/24. Never below 14px.
- **Cause colours** (chip background with an icon):
  - Teaching: soft blue
  - Plantation and environment: soft green
  - Food: soft orange
  - Animals: soft brown
  - Health: soft red
  - Elderly: soft purple
  - Skills and online: soft teal

### A3. Imagery
- Use **illustrated people** (Open Peeps, CC0, recoloured to the palette) or **royalty-free photos** of Indian volunteers in action, such as tree planting, teaching kids or packing food. Unsplash or Pexels are fine.
- Never use real NGO logos or brands.
- Show faces and hands doing things. Avoid stock handshakes and people at laptops.
- Avatars: initials in a coloured circle when no photo exists.

### A4. Signature components
1. **Activity card**
   - Large marigold date block on the left (day, date, month)
   - Title in Fraunces
   - Cause chip
   - NGO name with a small round teal tick if checked
   - One line each for time, place and duration
   - "3 spots left" shown as filled and empty dots
2. **Trust tick:** a small teal circle with a check. The tooltip and tap text read: "We've met this NGO and checked their registration."
3. **Track-record dots:** a row of up to 10 dots (filled teal = came, grey = freed spot early, red outline = didn't come), with "Came 7 of 7 times" beside it. This is used everywhere a volunteer's history is shown.
4. **Big-choice buttons:** two full-width stacked buttons for important decisions ("Yes, I'll be there" / "I can't make it").
5. **Bottom sheet:** booking and freeing a spot happen in a sheet that slides up, never a new page.
6. **"Who's coming" bar:** one horizontal bar per activity split into coming (green), not heard back (amber) and freed (grey) against the needed count. Empty slots show as dashed outlines.
7. **Toast:** short warm confirmations after actions ("Done. They'll be glad to have you.").

### A5. Motion and polish
- 150–200ms ease-out on sheets, buttons and toasts. A small confetti burst only when a booking is made.
- Skeleton loaders, never blank screens. Empty states always have an illustration, one line and one button.
- Accessibility: AA contrast, tap targets ≥44px, and status always shown in text as well as colour.

---

## Part B: Content (copy deck)

### B1. Voice
- **Volunteers:** like a friend who organises things well: warm, quick, never preachy.
- **NGOs:** like a capable colleague who gets their weekend back for them: respectful, practical, never salesy.
- **Words to avoid in the UI:**

  | Avoid | Say instead |
  |---|---|
  | reliability record | track record / "came 7 of 7 times" |
  | release | free up my spot |
  | slot, booking | spot |
  | task | activity (volunteer side) / need (NGO side) |
  | 48-hour confirmation | "We'll check in with you on Thursday" |
  | no-show | didn't come |
  | turnout view | who's coming |
  | verification | checked |
  | micro-volunteering, platform, pilot, MVP | (don't use) |

- **Always show real times instead of rules,** e.g. "Free up your spot by Fri, 10 am" rather than "24 hours before".

### B2. Landing page (`/`)
**Hero**
- Eyebrow: *Volunteering in your city*
- H1: **Give a few hours. Make them count.**
- Sub: Real people, real causes, close to home, and NGOs who'll be glad you came.
- Buttons: **I run an NGO** (primary) · **I'm volunteering** (secondary)
- Small line under the buttons: *Got a link from an NGO? Just open it, that's all you need.*
- Visual: an illustrated group planting a tree and teaching kids, in marigold and teal.

**Trust strip** (3 icons in one row, one line each)
- ✓ Every NGO is checked by us
- 🔒 Your number stays private until you're confirmed
- ↺ Plans change. Telling them takes one tap.

**For NGOs** (left image, right text)
- H2: **Know who's really coming.**
- Text: Post a need in two minutes. Share one link in your WhatsApp group. See who's coming, who's confirmed and who can't make it, before the day, not on it.
- Three points with icons:
  - Clear details, so no more explaining on calls
  - Reminders go out for you
  - See who's shown up before
- Button: **Post your first need**

**For volunteers** (right image, left text)
- H2: **Show up for something real.**
- Text: Everything you need on one card: when, where, what you'll do. Can't make it after all? Free up your spot in one tap, and someone else gets to go.
- Three points:
  - Exact time, place and role, upfront
  - Friendly reminders, no spam
  - Your track record travels with you
- Button: **See my plans**

**What NGOs told us** (a quote band, clearly framed as research and not a testimonial)
- "Maybe one in ten people actually tell me they can't continue."
- *An NGO founder we spoke to while building Show-Up*
- Line under it: **That's what we're here to fix.**

**How it works** (3 steps, icon + 5 words max each)
1. Pick a spot that fits
2. Say "yes" the day before
3. Show up, and it counts

**Footer:** Show-Up · Made in India for people who show up · Privacy · Contact us

### B3. Sign in / phone check (`/verify`)
- H1: **Let's get you in.**
- Sub: Just your name and number. NGOs only see your number once you're confirmed.
- Fields and helpers:
  - Your name (helper: *As NGOs will see it*)
  - Mobile number, with +91 prefix
  - Email (helper: *For reminders, nothing else*)
- Button: **Send me a code**
- OTP screen: **Enter the 6-digit code** · *Sent to +91 98xxxxxx12* · Button **Continue** · link *Didn't get it? Send again in 0:30*
- Success toast: **You're in.**

### B4. Activity page (`/t/{slug}`), the most important screen
- **Top:** a cover image (cause illustration if the NGO has no photo), with the activity card overlaid.
- **H1** is the activity title, written by the NGO.
- **NGO row:** avatar · name · trust tick · "Hosted 12 activities on Show-Up" (only if >0).
- **Key details**, icon rows, one line each:
  - 📅 Sat, 12 Oct · 9:00 am – 12:00 pm (3 hours)
  - 📍 Hauz Khas Village, New Delhi · *Open in Maps* / or 💻 Online · *link shared once you're confirmed*
  - 🙋 What you'll do: {role}
  - ✅ You're done when: {done definition}
  - 🔁 One-off / Every Saturday for 4 weeks
  - 👥 3 of 10 spots left (dots)
- **Contact:** *{Contact name}, {role} · number shared once you're confirmed*
- **Sticky bottom button:** **Save my spot** (if full: **Tell me if a spot opens**. This adds them to the standby list our team works from).
- **Small promise under the button:** *Plans change? Free up your spot by Fri, 9 am, no questions asked.*

**Booking sheet**
- H: **Save your spot?**
- Summary: date, time, place on one card.
- Two short lines:
  - We'll check in with you on **Thu, 10 Oct**.
  - If something comes up, tell them by **Fri, 9 am**. It helps them find someone else.
- Button: **Yes, save my spot** · link *Not now*
- Success: confetti, then **You're in!** *{NGO} is expecting you on Sat.* Buttons: **Add to calendar** · **Share with a friend** (the friend button opens WhatsApp with the activity link).

### B5. Check-in page (`/c/{token}`), opened from the reminder
- H1: **Still on for Saturday?**
- Card with the activity summary.
- Big-choice buttons: **Yes, I'll be there** · **I can't make it**
- After "Yes": **Lovely. See you there.** *We'll send the details on the morning.*
- After "I can't make it":
  - Sheet titled **No worries. Thanks for telling them.**
  - Optional chips: Work came up · Not well · Travelling · Something else
  - Button: **Free up my spot**
  - Then: **Done. Your spot just went to someone else.** (or *…is open for someone else*)
- **If it's past the free deadline,** the sheet adds one gentle line: *It's close to the day, so this will show on your track record. Still much better than not turning up.*

### B6. My plans (`/me`)
- Tabs: **Coming up** · **Done**
- Each item shows the activity card plus a status pill:
  - **Saved** (teal)
  - **Confirmed** (green)
  - **Waiting for your yes**, which opens the check-in
  - **Freed** (grey)
  - **Came** (green tick)
  - **Didn't come** (red)
- **Track record card** at the top: dots, **Came 7 of 7 times**, and *NGOs see this when you join their activities.* If the volunteer has no history yet: *Your first activity starts your track record.*
- **Empty state:** illustration · **Nothing planned yet.** · *When an NGO shares an activity with you, it'll show up here.*

### B7. NGO onboarding (`/ngo`, `/ngo/join`)
- H1: **Spend your time on the cause, not on chasing people.**
- Sub: Post what you need, share one link, and see who's really coming.
- Button: **Get started, it's free**
- Steps (progress bar 1 · 2 · 3):
  1. **About you:** your name, your role, phone
  2. **Your NGO:** name, city, what you work on (cause chips), registration number (*optional for now, it helps us add your trust tick*)
  3. **Invite code:** *Got one from our team? Pop it in.*
- After sign-up: **Thanks! We'll have you set up within a day.** *We call every NGO before they go live. It's how volunteers know you're real.*

### B8. Post a need (`/ngo/tasks/new`)
- H1: **What do you need help with?**
- Sections, with short labels and examples as placeholders:
  - **The activity:** title (*e.g. Pack ration kits for 200 families*), cause chips, what volunteers will do (*e.g. Sort and pack rice, dal and oil*), **When is it done?** (*e.g. All 200 kits packed and stacked*)
  - **When:** date, start, end · toggle *This repeats* → every week / every 2 weeks, how many times
  - **Where:** At a place (address plus map pin) / Online (link)
  - **How many people:** stepper
  - **Who to contact on the day:** name, role, phone
- **Live preview** labelled **This is what volunteers will see.**
- Button: **Post and get my link**
- Success:
  - **Your link is ready.**
  - Big copyable link
  - Buttons: **Share on WhatsApp** (prefilled: *We need {n} people for {title} on {day}. Pick a spot here: {link}*) · **Copy link** · **Copy for Instagram**

### B9. NGO dashboard (`/ngo`)
- H1: **Good morning, {first name}.** (time-aware)
- **Upcoming card** for each activity:
  - title and date
  - the "Who's coming" bar
  - **8 coming · 2 not heard back · 1 freed their spot · 1 to go**
- **Needs attention** banner (amber) when someone has freed a spot or not replied close to the day: *2 people haven't confirmed for Saturday. We've reminded them.*
- **Past card:** **Mark who came** (if not done yet) · then **11 of 12 came**.
- **Empty state:** **Your first need takes two minutes.** with the button **Post a need**.

### B10. Who's coming (activity detail, NGO)
- Header: title · date · "Who's coming" bar.
- **People list**, each row:
  - avatar
  - name with last initial
  - status pill (**Coming** / **Not heard back** / **Freed their spot**, with their reason if given)
  - track-record dots with "Came 7 of 7 times"
- **Phone** is shown only for confirmed people. Tap to call or WhatsApp.
- **Freed spot banner:** *Priya freed her spot (work came up). We're finding someone.*
- **After the day:** a toggle mode, **Mark who came**, with a big ✓ / ✕ on each row, then the button **Save**, then the toast **Thanks! Everyone's track record is updated.**

### B11. Messages (email and WhatsApp)
| When | Message |
|---|---|
| Spot saved | You're in for **{title}** with {NGO} on {day, date} at {time}. 🙌 We'll check in with you on {check-in day}. Plans change? Free up your spot here: {link} |
| Check-in (2 days before) | Hi {first name}, still on for {title} this {day} at {time}? Tap to let {NGO} know: {link} |
| Gentle nudge (if no reply) | Quick one: are you coming to {title} on {day}? One tap helps {NGO} plan: {link} |
| Morning of | Today! {title} at {time}, {place or link}. Ask for {contact name}. You're done when: {done}. Thank you for showing up. 💛 |
| Spot freed (to volunteer) | All sorted, your spot is free for someone else. Thanks for letting {NGO} know. |
| Spot freed (to NGO) | {Name} can't make it to {title} ({reason}). {coming} of {needed} coming. We're on it. |
| After the day (to NGO) | How did {title} go? Mark who came, it takes 30 seconds: {link} |

### B12. Errors and edge cases
- **Full:** **All spots are taken.** Button **Tell me if a spot opens**, then *We'll message you if someone frees theirs.*
- **Past activity:** **This one's already happened.** *Ask {NGO} for their next one.*
- **Wrong code:** **That code didn't work.** *Check the SMS and try again.*
- **Generic:** **Something went wrong on our side.** *Please try again. We've been told.*

### B13. Feature names (UI label vs. our assignment's name, for screenshots)
| Assignment name | UI label |
|---|---|
| Task template | Post a need |
| Shareable task card | Activity page / activity card |
| Book with phone check | Save my spot (+ phone check) |
| Confirm-and-release loop | Check-in · "I can't make it" · Free up my spot |
| Attendance marking | Mark who came |
| Reliability record | Track record ("Came 7 of 7 times") |
| Turnout view | Who's coming |
| ID verification and trust levels | Get your ID checked · Checked · Regular |
| One feed with filters | Explore |
| Verified NGO profile | NGO page with trust tick |
| Standby cover | "Free at short notice" |
| Re-engagement nudge | "Miss it?" card |

Trust levels in the UI:
- **New**: no badge
- **Checked**: ID checked (teal shield)
- **Regular**: ID checked plus 3 times came, no misses (marigold star)

---

## Part C: Demo mode (the prototype screens the live app doesn't have)

The live app covers SH3, SH6 and most of SH7. The assignment also needs a prototype for SH1, SH2, SH4, SH5 and the standby part of SH7. Build these as a **demo mode** in the same app, reusing the Part A components.

**How it works**
- Route prefix `/demo`. Sample data is held in a local JSON file; there is no backend and nothing is saved.
- A small pill top-right reads **Demo**.
- Use the demo data in Part E.
- A hidden reset at `/demo/reset` returns to the start state.
- No Test Lab is needed. We'll run the tests with a stopwatch and a notes sheet.

### C1. `/demo/explore`: Explore (SH1)
- H1: **What would you like to do?**
- **Cause chips** (multi-select, with icons): Teaching · Trees & green · Food · Animals · Health · Elders · Skills & online
- **Filter row:** Near me / Online · This weekend / Pick a date · Morning / Afternoon / Evening · Up to 2h / 2–4h / Longer · One-off / Regular
- **Results:** activity cards, plus "{n} activities match".
- Each card opens the activity page from B4, in demo, with a working **Save my spot** that leads to the success screen.
- **Ask {NGO}:** a small text button on the activity page. Note on a paper sheet whether testers tap it.

### C2. `/demo/ngo/{slug}`: NGO page (SH2)
- **Cover photo,** NGO name and trust tick ("Checked by Show-Up · Registered NGO").
- **Short about** (2 lines).
- **Small stats:**
  - **48 volunteers have joined**
  - **Replies within a day**
  - **4.7 ★ from 23 volunteers**
- **Two short reviews:** first name, cause, one line each (fictional, shown only in demo).
- **Upcoming activities** list.
- For the SH2 test, show 3 similar activities side by side:
  - one from a checked NGO with reviews
  - two from NGOs with no tick and no reviews

### C3. `/demo/home`: "Miss it?" nudge (SH4)
- The home screen of Aditi, who hasn't joined anything in 45 days and just moved from Noida to Hyderabad.
- **Top card** (marigold soft): **It's been a while, Aditi. Welcome to Hyderabad!** *3 things this weekend match Food and Teaching, near you or online.*
- 3 mini activity cards and a **See all** button.
- Dismiss **×** → *We'll keep a few ideas for you in Explore.*

### C4. `/demo/ngo/applicants`: People who joined (SH5)
- H1: **5 people want to help on Saturday.**
- Five rows: avatar, first name and last initial, a level badge (none / Checked / Regular), track-record dots, NGO ratings ("On time ×4"), and "Joined 2 months ago".
- Each row has **Accept** / **Not this time**.
- **The five profiles:**
  1. Regular · came 9 of 9 · "On time ×5"
  2. Checked · came 3 of 4 · freed 1 late
  3. New · no history yet
  4. Checked · came 5 of 7 · 2 didn't come · "Paused from Checked-only activities until 12 Nov"
  5. Regular · came 12 of 12 · "Would invite again ×5"
- When all five are decided, a summary card shows: *You've accepted {n}. They'll get a message now.*

### C5. `/demo/me/standby` and `/demo/ngo/standby`: Free at short notice (SH7)
- **Volunteer view:** a toggle card, **Free at short notice?** *Pick a day and we'll offer you spots that open up near you.* Day picker, area, causes.
- **Then a demo offer card:** **A spot just opened!** Pack 200 ration kits · Sun 10 am · 2 km away · *First to say yes gets it* · **I'll take it** / **Not this time**, with a 2-hour countdown.
- **NGO view:**
  - the "Who's coming" bar showing *1 freed their spot → filled from standby in 12 min*
  - a planning question card: **You need 15 people. How many sign-ups would you aim for?** (number input; shows *Saved* on submit)

### C6. `/demo/me/get-checked`: Get your ID checked (SH5 support)
- H1: **Get your ID checked.**
- Sub: *Some NGOs, like those working with children, only accept people who've been checked. It takes 2 minutes.*
- Steps: choose an ID (Aadhaar, PAN, Driving licence, Passport) → snap a photo (placeholder only; nothing is uploaded) → **We're checking. Usually within a day.** → (demo) **You're checked ✓**
- The levels card shows New → Checked → Regular, with one line each on what it unlocks.

---

## Part D: Done when
- Every screen uses the Part A tokens and components. There is no default shadcn grey look anywhere.
- No screen has a paragraph longer than 2 lines on a phone, and none of the "avoid" words from B1 appears.
- Every time-based rule is shown as a real day and time.
- The activity page, check-in page and dashboard look right at 390px wide and at 1280px wide.
- Demo pages reachable: `/demo/explore`, `/demo/ngo/{slug}`, `/demo/home`, `/demo/ngo/applicants`, `/demo/me/standby`, `/demo/ngo/standby`, `/demo/me/get-checked`.
- Lighthouse on mobile scores ≥90 for accessibility and ≥85 for performance on the activity page.

---

## Part E: Demo data, drawn from our research (replaces PRD §11)

**Rule:** every demo record is based on something an interviewee told us, with the same situation, cause, city, numbers and kind of person. Names of real NGOs and real interviewees are **not** used, because demo pages show invented ratings, reviews and attendance.
- Volunteers use our persona names and new first names.
- NGOs use made-up names, each modelled on one interviewed NGO.
- The "Based on" column is for our team only. **Never show it in the app.**

### E1. NGOs (8)
| Demo name | Based on | City | What they do (from interviews) | Stats to show |
|---|---|---|---|---|
| **Gyaan Ghar Foundation** | SJ-N1 (education founder) | Delhi | After-school learning for children in a basti; ~15 active volunteers | 15 regulars · replies within a day · 4.6 ★ (18) |
| **Prerna Shiksha Sangathan** | GD-N1 (family-run education NGO) | Rural Maharashtra (villages near Aurangabad) | Free schooling; scholarships; awareness drives against underage marriage at village melas; hour-long online talks by professionals shown on a projector | 37 volunteers · "not one has left" · 4.9 ★ (21) |
| **Mamta Shishu Ashray** | GD-N2 (child-welfare centre) | Delhi | Day care for children of domestic workers; mother-and-child home | Volunteers plus paid staff · Checked-only activities for child care · 4.7 ★ (12) |
| **Saath Sikhein Collective** | AG-N1 (community education NGO) | Jaipur | Weekend learning sessions; big event days that need 20–25 extra hands | 15 regulars + event-day volunteers · 4.4 ★ (16) |
| **Hunar Haath Collective** | SC-N2 (women artisans) | Delhi | Two founders, no regular volunteers; need one-off skilled help: product photos, catalogue design, accounts | New on Show-Up · no reviews yet (**this is the "unchecked" NGO for SH2**) |
| **Ghar Ki Didi Trust** | GK-N2 (domestic workers' trust) | Pune | Support for domestic workers; needs help writing briefs and forms | 4 part-time staff · 4.5 ★ (9) |
| **Hands Together Seva** | BH-N2 (recruits via Google Forms + WhatsApp) | Panipat | Food and clothes drives; plantation weekends | 4.3 ★ (11) |
| **Annadaan Noida Circle** | GD-V2's Feeding India experience | Noida | Collect checked leftover restaurant food and distribute it in labour colonies; weekend meal packing | 4.6 ★ (27) |

All are fictional names. Use cause illustrations, not logos.

### E2. Activities (from situations people described)
| Activity | NGO | Based on | When / commitment | Spots |
|---|---|---|---|---|
| Science with hands-on kits for class 6–8 (magnets, hydraulics, circuits) | Gyaan Ghar Foundation | GD-V1's Prayogshala weekends | Every Saturday, 45 min, 4 weeks | 4 of 6 |
| Spoken English class for a Rajasthan village school, online | Saath Sikhein Collective | GD-V3's online teaching | Tue + Thu, 1 hour, minimum 5 classes | 2 of 4 |
| Pick up and check leftover restaurant food, then distribute | Annadaan Noida Circle | GD-V2 | Sat, 7–9 pm, one-off | 3 of 8 |
| Pack 200 ration kits | Annadaan Noida Circle | GD-V2's Covid drives | Sun, 10 am–1 pm, one-off | 6 of 15 (**the "15-person drive" for SH7**) |
| Village mela stall: talk to parents about keeping girls in school | Prerna Shiksha Sangathan | GD-N1 | Sat, 10 am–4 pm, one-off | 2 of 4 |
| Career talk for students, online (shown on a projector in the village school) | Prerna Shiksha Sangathan | GD-N1 ("corporate professionals ask for an hour") | Any Sunday, 1 hour, online | 1 of 1 |
| Play and story time at the day-care centre (Checked volunteers only) | Mamta Shishu Ashray | GD-N2 | Weekdays 4–6 pm, every week for 4 weeks | 2 of 3 |
| Photograph products and design a 6-page catalogue | Hunar Haath Collective | SC-N2 | Online, ~3 hours, done by Fri | 1 of 1 |
| Help fill government scheme forms for domestic workers | Ghar Ki Didi Trust | GK-N2 | Sun, 11 am–2 pm, one-off | 3 of 5 |
| Tree planting along the canal | Hands Together Seva | BH-N2 | Sat, 7–10 am, one-off | 10 of 25 |
| Event-day helpers for the annual learning fair | Saath Sikhein Collective | AG-N1 ("30 sign up, only 18 come") | Sun, 9 am–2 pm, one-off | 12 of 25 |
| Blood donation camp registration desk | Hands Together Seva | SC-V3 (Rotaract blood drive) | Sun, 9 am–1 pm, one-off | 2 of 4 |

### E3. Demo volunteers (personas plus research profiles)
| Demo name | Based on | Profile | Track record |
|---|---|---|---|
| **Rohan Verma** (the tester's account for SH1–SH3) | Persona 1 (from GD-V1) | 2nd-year engineering student, Delhi; likes teaching; came via college group | Came 2 of 2 · Checked |
| **Aditi Kapoor** (tester's account for SH4: last active 45 days ago, moved city) | Persona 2 (from GD-V2, GD-V3) | 25, works in sales; moved from Noida to Hyderabad; likes food drives and teaching online | Came 6 of 6 · Regular |
| Priya S. | SJ-V4 | 24, article assistant, Nagpur; volunteers irregularly | Came 2 of 2 |
| Divya M. | SJ-V3 | 27, software engineer, Delhi; lapsed since college | Came 9 of 9 · Regular |
| Ishaan R. | SC-V3 | 25, software engineer, Bengaluru; blood drive once | Came 1 of 1 |
| Sana K. | AG-V1 | 28, operations, Bengaluru; works 6 days a week | Came 3 of 4 · freed 1 late |
| Kabir T. | GK-V2 | 21, B.Tech student, Pune; online internships | New · no history |
| Meera J. | BH-V2 | 27, ex-engineer now MBA, Gurugram; former volunteer coordinator | Came 12 of 12 · Regular |
| Arnav P. | AG-V2 | 20, undergrad, Delhi; college drives only | Came 5 of 7 · 2 didn't come |

**SH5's five applicants** for "Play and story time" at Mamta Shishu Ashray (a child-care activity, so trust matters most):
1. Divya M.: Regular, came 9 of 9, "On time ×5"
2. Sana K.: Checked, came 3 of 4, freed 1 late
3. Kabir T.: New, no history yet
4. Arnav P.: Checked, came 5 of 7, 2 didn't come, *Paused from Checked-only activities until 12 Nov*
5. Meera J.: Regular, came 12 of 12, "Would invite again ×5"

### E4. NGO coordinator account (tester's account for SH5–SH7)
**Rekha Joshi** (Persona 3, from GD-N1 and GD-N2), coordinator at **Annadaan Noida Circle** for SH6 and SH7. For SH5 she switches to **Mamta Shishu Ashray**.

### E5. Reviews (demo only, short, written as volunteers would talk)
- "Clear brief, started on time, and they actually needed us." *(Divya, Teaching)*
- "Knew exactly where to go and who to ask for." *(Meera, Food)*
- "Kids were lovely. The didi in charge made it easy." *(Sana, Child care)*

### E6. Live MVP: no demo data
The live app (not `/demo`) must start empty. Real activities come only from partner NGOs who agree to pilot with us. Our interviewees are the first people to ask: Meenu's Sewa Bharti centre (GD-N2), the Maharashtra NGO (GD-N1) and Kavita's NGO in Jaipur (AG-N1). Their real names appear there only with their consent.
