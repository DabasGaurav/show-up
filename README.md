# Show-Up

Two-sided micro-volunteering platform. One codebase, two modes — see [docs/PRD.md](docs/PRD.md).

| Command | What it does |
|---|---|
| `npm run dev:proto` | Prototype mode on http://localhost:3100 (sample data, Test Lab) |
| `npm run dev:mvp` | MVP1 mode on http://localhost:3101 (F1–F7 + admin) |
| `npm test` | Unit tests for the §5 business rules and the schema |
| `npm run typecheck` / `npm run lint` | Static checks |

## Layout

- `app/` routes · `components/` UI · `lib/strings.ts` every user-facing string
- `lib/flags` — `APP_MODE` and the F1–F17 feature table; `requireFeature()` 404s routes outside the mode
- `lib/rules` — every PRD §5 business rule as a pure function, policy values in `config.ts`
- `lib/db` — Postgres access. With `DATABASE_URL` set it talks to Supabase; without it, it runs an
  embedded Postgres (PGlite) in `.data/` using the same `supabase/migrations`
- `supabase/migrations` schema + RLS · `supabase/seed` prototype sample data · `tests/`

## Build log

Milestones follow PRD §15. Progress and decisions: [docs/BUILD_LOG.md](docs/BUILD_LOG.md).
