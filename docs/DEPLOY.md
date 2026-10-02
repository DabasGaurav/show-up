# Deploying Show-Up

Two Vercel projects from the same repo, each with its own Supabase project (the prototype's is seeded,
MVP1's starts clean). Nothing here has been done yet: it needs the team's Supabase and Vercel accounts.

## 1. Supabase (once per mode)

1. Create a Supabase project. Copy the **connection string** (Settings → Database → Connection pooling,
   "Transaction" mode) and, for MVP1 with SMS, the project URL and anon key.
2. Apply the schema and RLS:
   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   ```
3. Prototype only, load the sample data:
   ```bash
   DATABASE_URL="postgres://…" npm run db:seed -- --yes
   ```
   (In the deployed prototype you can also reset it any time from `/admin` → Reset sample data.)

## 2. Vercel (once per mode)

Import the repo twice (e.g. `showup-proto`, `showup-mvp`) and set:

| Variable | Prototype | MVP1 |
|---|---|---|
| `APP_MODE` | `prototype` | `mvp` |
| `DATABASE_URL` | prototype Supabase | MVP Supabase |
| `SESSION_SECRET` | long random string | a different long random string |
| `ADMIN_PASSCODE` | team passcode | team passcode |
| `LAB_PASSCODE` | facilitator passcode | — |
| `NEXT_PUBLIC_SITE_URL` | `https://showup-proto.vercel.app` | `https://showup-mvp.vercel.app` |
| `CRON_SECRET` | random string | random string |
| `AUTH_METHOD` | — (simulated) | `email`, or `sms` |
| `RESEND_API_KEY`, `EMAIL_FROM` | — | Resend key and a verified sender |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | — | only for `AUTH_METHOD=sms` |
| `NGO_INVITE_CODES` | — | optional; codes can also be created in `/admin` |

`AUTH_METHOD=sms` uses Supabase phone auth and needs an Indian SMS provider configured in Supabase.
With no SMS budget use `AUTH_METHOD=email`: the code goes by email and the phone number is still collected.

## 3. Scheduled jobs

`vercel.json` calls `/api/cron` every 15 minutes (Vercel sends `Authorization: Bearer $CRON_SECRET`).
Vercel's free plan only allows daily cron jobs. If you are on it, schedule the same call from Supabase
instead (SQL editor, with `pg_cron` and `pg_net` enabled):

```sql
select cron.schedule('showup-jobs', '*/15 * * * *', $$
  select net.http_get(
    url := 'https://showup-mvp.vercel.app/api/cron',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

The jobs are idempotent, and every page that shows booking status also runs them, so a late cron run
never sends a message twice or shows stale state.

## 4. Smoke test after deploying

- `/api/health` returns `{"ok":true,"mode":"…","tables":13}`.
- MVP1: `/feed` and `/lab` return 404. Prototype: `/admin/reminders` returns 404.
- Share a `/t/{slug}` link in WhatsApp and check the preview shows the title, date and NGO name.
