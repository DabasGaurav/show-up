# Show-Up

Give a few hours. Make them count. NGOs post short volunteering activities; people save a spot, say yes two days before, and turn up (or free the spot in time).

One app, one database. The full spec is in [docs/SPEC.md](docs/SPEC.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000, local database in .data/
npm run seed         # sample NGOs and activities, local only
npm test             # rules, flows, schema
```

Locally no email is sent: the sign-in link is shown on screen and other emails are logged. Admin passcode on your machine: `showup-admin`. Sample coordinator: `rekha.joshi@example.org`.

`npm run seed` refuses to run in production or against a hosted database.

## Pages

| Who | Page |
|---|---|
| Volunteer | `/` explore, `/a/{slug}` activity, `/signin`, `/me` my plans, `/c/{token}` check-in, `/ngo/{slug}` |
| NGO | `/for-ngos` sign-up, `/dashboard`, `/dashboard/new`, `/dashboard/a/{id}` who's coming |
| Team | `/admin` approve NGOs, the one number, CSV export |

## Where things live

- `lib/rules/` the rules in spec §3 (pure functions, tested)
- `lib/messages.ts` every email, word for word from spec §4
- `lib/jobs.ts` timed emails; run by `/api/cron` and when people open their pages
- `lib/data/` database reads and writes
- `supabase/migrations/` schema, `supabase/seed/` sample data

## Hosting

See [docs/DEPLOY.md](docs/DEPLOY.md).
