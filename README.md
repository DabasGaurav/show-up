# Show-Up

Give a few hours. Make them count. NGOs post short volunteering activities; people save a spot, say yes two days before, and turn up (or free the spot in time).

One app, one database. The full spec is in [docs/SPEC.md](docs/SPEC.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000, local database in .data/
npm run seed         # sample NGOs and activities, local only
npm test             # rules, flows, schema
npm run listings:check   # launch listings: what would change (writes nothing)
npm run listings:import  # load data/listings.json; safe to run again
```

Locally no email is sent: the sign-in link is shown on screen and other emails are logged. Admin passcode on your machine: `showup-admin`. Sample coordinator: `rekha.joshi@example.org`.

`npm run seed` refuses to run in production or against a hosted database.

## Pages

| Who | Page |
|---|---|
| Volunteer | `/` explore, `/a/{slug}` activity, `/signin` sign in or sign up, `/me` my plans, `/account` details and track record, `/c/{token}` check-in, `/ngo/{slug}` |
| NGO | `/for-ngos`, `/for-ngos/signup`, `/dashboard`, `/dashboard/new`, `/dashboard/a/{id}` who's coming |
| Team | `/admin` approve, add, edit, hide and delete NGOs, activities and spots; open any NGO's dashboard or volunteer's plans ("Viewing as"); the one number; CSV export |

## Launch listings

`data/listings.json` holds the NGOs, activities and people from our interviews. Everything loaded from it is marked as a launch listing: it never gets email (all addresses are `@showup.test`, and the sender refuses that domain) and its spots are left out of the admin number. With `DATABASE_URL` set the two commands work on the hosted database. The fix list this came with is in [docs/FIXES_AND_LISTINGS.md](docs/FIXES_AND_LISTINGS.md).

## Where things live

- `lib/rules/` the rules in spec §3 (pure functions, tested)
- `lib/messages.ts` every email, word for word from spec §4
- `lib/jobs.ts` timed emails; run by `/api/cron` and when people open their pages
- `lib/data/` database reads and writes
- `supabase/migrations/` schema, `supabase/seed/` sample data

## Hosting

See [docs/DEPLOY.md](docs/DEPLOY.md).
