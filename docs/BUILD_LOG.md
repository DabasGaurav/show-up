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
