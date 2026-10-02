# Build log

## Milestone 1 — Foundation (done, 2 Oct 2026)

- Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui.
- Schema for all §7 tables plus derived views (`v_reliability`, `v_trust_level`, `v_org_response_rate`,
  `v_turnout`); RLS enabled on every table.
- Mode flag (`APP_MODE`) and feature table in `lib/flags`.
- All §5 rules in `lib/rules` with unit tests (36 tests).
- Design tokens (#1F3864, status green/amber/grey/red, Inter), landing page.

### Decisions

- **Local database:** this machine has no Docker or Postgres, so local dev uses embedded Postgres
  (PGlite) running the exact Supabase migrations. Setting `DATABASE_URL` switches to Supabase.
- **Added to the schema beyond §7:** `notifications.dedupe_key` (idempotent scheduled jobs, §13) and
  an `app_state` table (simulated clock, §4.1).
- **Not yet deployed:** needs a Supabase project and a Vercel project (owner action).

## Milestone 2 — NGO side core (done)

Phone check (`/verify`), NGO join (`/ngo/join`, invite code in MVP1), admin approval (`/admin`), task
template with live preview and map pin (`/ngo/tasks/new`), share link with copy / WhatsApp / Instagram
caption, public task page `/t/{slug}` with Open Graph tags and a generated preview image.

## Milestone 3 — Volunteer core (done)

Booking sheet, My bookings (`/me`), 48-hour confirmation view (`/c/{token}`) with one-tap release,
scheduled jobs (`/api/cron`, every 15 min, idempotent), prototype Message preview panel and simulated
clock, MVP1 admin Reminders queue and Released slots queue with `wa.me` links.

## Milestone 4 — Attendance and records (done) → MVP1 feature-complete

Turnout view per occurrence with attendance marking, reliability record on both sides, post-event
"minutes spent chasing" question.

### Decisions

- **Sessions:** signed http-only cookie issued after the phone check. In MVP1 `AUTH_METHOD=sms` uses
  Supabase phone auth; `AUTH_METHOD=email` sends the code by email (Resend); locally the code is printed
  in the server log.
- **One dev server per mode:** `dev:proto` (3100) and `dev:mvp` (3101) keep separate build folders and
  separate local databases (`.data/pglite-prototype`, `.data/pglite-mvp`).
- **Tasks have a `city` column** (not in §7) so on-site tasks can be in a different city from the NGO (§18).
- **Seats are derived, not stored:** a released seat reopens the moment its booking status changes.

## Milestone 5 — Trust layer (prototype, done)

ID verification simulation (`/verify/id`, approvals in `/admin/ids`), trust levels New → Verified → Trusted,
minimum trust level per task, no-show consequences (pause shown and enforced in the prototype, text only in
MVP1), applicant profiles with accept / decline. Full §11 seed data.

## Milestone 6 — Discovery and NGO trust (prototype, done)

Feed with all eight filter groups, Verified NGO profile panel (photos, about, past volunteers, rating,
latest two reviews, response rate), Contact NGO sheet, guaranteed response (48h auto-release with similar
tasks), two-way ratings.

## Milestone 7 — Retention and cover (prototype, done)

Standby switch, standby offers (Trusted first, first to accept wins, others see "This slot has been taken"),
standby cover log on the turnout view, re-engagement nudges (30 days inactive or a change of city),
My profile with level progress, streak and verified hours.

## Milestone 8 — Test Lab (prototype, done)

`/lab`: SH1–SH7 with scripted setup, the simulated clock, a floating "End task" button, auto-captured
metrics, facilitator form and `/lab/export` CSV.

## Milestone 9 — Admin metrics and polish (done)

Metrics dashboard (§10), CSV exports (bookings, per-event metrics, event log, volunteers, organisations,
lab sessions), request-level mode gating, accessibility pass, Supabase scripts, production builds for both
modes.

### Decisions and things worth knowing

- **Built with Claude Code, not Codex.** The PRD names Codex as the build tool; the prompts actually used
  are in [PROMPTS.md](PROMPTS.md) for Appendix A.3.
- **Lab clock:** starting a scenario resets the sample data and pins "Now" to the coming Thursday 10:00 IST,
  so "this weekend" is always two days away. Ending the task returns the prototype to real time.
- **Resetting sample data keeps the evidence:** lab sessions and the event log survive every reset.
- **Seed "photos" are generated illustrations** (a gradient tile with the cause icon), never real images.
- **Ratings have no free-text field** (§7 has score and tags only), so "reviews" show stars, tags, first
  name and date.
- **Distance** is measured from the selected city's centre (no device location is requested).
- **"Unconfirmed"** in the turnout strip counts every booking not yet confirmed; the chip turns to the amber
  "Unconfirmed" label at T−24h, as §5.3 describes.
- **F13 in MVP1:** the rule text is shown on the booking sheet and nothing is enforced.
- **MVP1 released-slot fills** are bookings with `source = admin`; the prototype's are `source = standby`.
- **Message preview** opens on "This account" so a tester sees their own messages; "Everyone" shows all.

### Not done (needs the team)

- **Deployment.** No Supabase or Vercel project has been created. Steps are in [DEPLOY.md](DEPLOY.md).
- **Real SMS / email.** `AUTH_METHOD=sms` (Supabase phone auth) and Resend email are implemented against
  their HTTP APIs but have not been exercised with real credentials.
- **RLS policies** are written and applied (RLS is on for all 13 tables), but the app talks to Postgres
  through the server with a service connection, so the policies have not been tested through Supabase's
  client-side API.
- **WhatsApp link preview** has only been checked by reading the Open Graph tags and rendering the preview
  image locally; it needs a public URL to confirm inside WhatsApp.
- **Performance target** (<2.5s first load on mid-range Android over 4G) has not been measured on a device.

## Hosting (2 Oct 2026)

- **MVP1 is live at https://showup-mvp-rosy.vercel.app** (Vercel project `showup-mvp`, team GAURAV).
- **Database:** Neon Postgres from the Vercel Marketplace (`showup-mvp-db`), not Supabase. The same migrations
  run there; the migration step adds a stub `auth.uid()` when the host is not Supabase. Moving to Supabase
  later means running `npm run db:migrate` against it and changing `DATABASE_URL`.
- **Cron runs once a day** (Hobby plan limit). Pages that show booking status run the same jobs on load.
- **Secrets** (session secret, admin passcode, cron secret) are in the gitignored `.env.hosted-mvp`.
- **Not set yet:** `RESEND_API_KEY` / `EMAIL_FROM`. Until then sign-in codes are not delivered.
- **Prototype is not hosted**; it runs locally.
