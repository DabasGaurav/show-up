# Show-Up

Two-sided micro-volunteering platform built on trust in both directions. One codebase, two modes.
Spec: [docs/PRD.md](docs/PRD.md) · Build log and decisions: [docs/BUILD_LOG.md](docs/BUILD_LOG.md) ·
Deploying: [docs/DEPLOY.md](docs/DEPLOY.md) · Screenshots: [docs/screenshots](docs/screenshots)

| Mode | `APP_MODE` | What is reachable |
|---|---|---|
| Prototype | `prototype` | F1–F17 on sample data, Message preview, simulated clock, Test Lab (`/lab`) |
| MVP1 | `mvp` | F1–F7 plus the admin console. Everything else returns 404 |

## Run it locally

```bash
npm install
npm run dev:proto   # prototype  → http://localhost:3100
npm run dev:mvp     # MVP1       → http://localhost:3101
```

No database setup is needed: without `DATABASE_URL` the app runs an embedded Postgres in `.data/`
(one database per mode) using the same migrations that go to Supabase. The prototype seeds itself on
first start.

Local passcodes (set real ones through env vars before deploying):

| Area | URL | Local passcode |
|---|---|---|
| Admin console | `/admin` | `showup-admin` |
| Test Lab (prototype) | `/lab` | `showup-lab` |

In the prototype, `/admin` has **Open as sample volunteer / NGO coordinator**, **Reset sample data**
and the **simulated clock**. In MVP1 locally, the phone-check code is printed in the server log
(`AUTH_METHOD=dev`); NGOs need an invite code, which you create in `/admin`.

## Commands

| Command | What it does |
|---|---|
| `npm test` | 77 tests: every §5 rule, the schema, booking/attendance/standby flows, seed data, one end-to-end test per Test Lab scenario |
| `npm run typecheck` · `npm run lint` | Static checks |
| `npm run build` · `npm run build:mvp` | Production builds |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` (Supabase) |
| `npm run db:seed -- --yes` | Rebuild the prototype sample data in `DATABASE_URL` |

## Where things live

- `app/` routes · `components/` UI · `lib/strings.ts` fixed copy (§8.3) and shared labels
- `lib/flags` `APP_MODE`, the F1–F17 table, and `routes.ts` (which paths exist in which mode; enforced in `proxy.ts`)
- `lib/rules` every PRD §5 business rule as a pure, unit-tested function; policy values (48h, 24h, 90 days,
  30 days, 3 slots…) in `config.ts`
- `lib/data` database access · `lib/jobs.ts` scheduled jobs (`/api/cron`, every 15 minutes, idempotent)
- `lib/messages.ts` message templates (§8.2) · `lib/notify.ts` channels (preview / email / WhatsApp queue)
- `lib/lab.ts` Test Lab scenarios, setup and evidence capture
- `supabase/migrations` schema + RLS · `supabase/seed` prototype sample data (all fictional)

## Routes

| Route | Screen | Mode |
|---|---|---|
| `/` | Landing page | both |
| `/verify` · `/verify/id` | Screen 1: Verify once (phone · ID) | both · proto |
| `/feed` | Screen 2: Feed with filters | proto |
| `/t/{slug}` | Screen 3: Task card (+ NGO profile in proto) | both |
| `/t/{slug}/book` · `/c/{token}` · `/me` | Screen 4: Booking, 48-hour confirmation, release, standby | both |
| `/me/profile` | Screen 5: My profile | proto |
| `/feed`, `/me` (top card) | Screen 6: Re-engagement nudge | proto |
| `/ngo/tasks/new` | Screen 7: Task template | both |
| `/ngo/tasks/{id}/applicants` | Screen 8: Applicant profiles | proto |
| `/ngo/tasks/{id}/turnout/{occurrence}` | Screen 9: Turnout view, attendance marking | both |
| `/ngo` · `/ngo/join` | NGO dashboard · NGO sign-up | both |
| `/admin` (+ `/metrics`, `/export`) | Admin console | both |
| `/admin/reminders` · `/admin/released` | WhatsApp reminders queue · Released slots queue | MVP1 |
| `/admin/ids` · `/lab` | Simulated ID checks · Test Lab | proto |
