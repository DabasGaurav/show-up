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
