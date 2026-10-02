# Hosting

Live: https://showup-mvp-rosy.vercel.app (Vercel project `showup-mvp`, Neon Postgres `showup-mvp-db`).

## Settings on Vercel

| Name | What it is |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `SESSION_SECRET` | signs the sign-in cookie |
| `ADMIN_PASSCODE` | opens `/admin` |
| `CRON_SECRET` | protects `/api/cron` |
| `NEXT_PUBLIC_SITE_URL` | the live address, used in email links |
| `CONTACT_EMAIL` | shown in the footer as "Write to us"; the line is left out until this is set |
| `RESEND_API_KEY`, `EMAIL_FROM` | **needed before anyone can sign in**: emails are only logged without them |

Values are kept in `.env.hosted-mvp` and `.env.neon` (not in git).

## Deploy

```bash
npm run db:migrate   # with DATABASE_URL set; applies any new file in supabase/migrations
vercel --prod
```

## Timed emails

`vercel.json` calls `/api/cron` once a day at 7:00 am IST (the free Vercel plan allows only daily jobs). The same checks also run whenever someone opens My plans, a check-in link or the dashboard. For emails at the exact hour, point any every-15-minutes scheduler at `/api/cron` with `Authorization: Bearer $CRON_SECRET`.

## Sample data

Never load it here. `npm run seed` and `/api/dev/seed` refuse to run in production.
