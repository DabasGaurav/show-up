# Show-Up: Fixes and Launch Listings (instructions for Claude Code)

**Context:** the app at `showup-mvp-rosy.vercel.app` follows `ShowUp_Build_Spec.md`.
- Keep everything that works.
- Do Parts 1–4 in order, then deploy.
- The file `listings.json` comes with this: put it in `/data/listings.json`.

---

## Part 1: Fix what's broken

1. **Clicks do nothing for ~2 seconds after load.**
   - On `/for-ngos`, the first click on "Sign up your NGO" did nothing.
   - Make all navigation plain `<a href>` / `<Link>` that works before hydration.
   - Lazy-load heavy client components (the cause illustrations, the filter panel) or make them server components.
   - **Target:** mobile Time to Interactive under 3 seconds.
2. **`/dashboard` signed out is a blank page.** Redirect to `/signin?next=/dashboard`.
3. **Cause pictures and filter chips are out of sync.**
   - Make them one shared state: clicking either selects the cause, highlights both, filters the list and scrolls to the results. Clicking again clears it.
   - Keep the filters in the URL (`/?cause=teaching&city=jaipur`).
4. **Places beyond 6 cities.**
   - **NGO sign-up and admin:** add "Other town or village" (shows a text box) and "We work online only".
   - **Volunteer filter:** add "Other places" and "Online".
   - Show the typed town (e.g. "Shimla", "Villages, Maharashtra") wherever the city appears.
5. **Styled 404** for unknown pages and missing activities:
   - Heading: **"This page isn't here."**
   - Text: "The activity may have finished or been taken down."
   - Button: **See what's on**.

## Part 2: Improve trust and sign-ups

6. **No "0" headline.** When a filter returns nothing, show: **"Nothing here yet."**, an email box **"Tell me when something's on"** (saved to a `waitlist_emails` table), and a link **"Run an NGO? Post the first one."**
7. **"How it works"** under the list (3 steps, icon plus a few words each):
   1. **Pick something that fits**
   2. **Say yes the day before**
   3. **Show up, and it counts**
8. **Tap on "Every NGO is checked by us"** opens: *"Before an NGO goes live, we speak to them and check who they are."*
9. **Phone on first booking.** The first time someone saves a spot, ask for name and mobile on the same sheet: *"Shared with the NGO only once you confirm."*
10. **NGO sign-up additions:**
    - Checkbox "My WhatsApp number is the same as my phone" (if unticked, show a second field).
    - Optional dropdown "How did you hear about Show-Up?" (Friend / Our team called / WhatsApp / Instagram / LinkedIn / Other).
11. **For NGOs page:** replace the repeated cause pictures with a preview of the **Who's coming** bar ("8 coming · 2 not heard back · 1 can't make it · 4 to go").
12. **Footer:** add "Write to us: {contact email}" and "Made in India".
13. **Share preview:** `/a/{slug}` needs Open Graph title, description and an image (cause illustration plus date) so WhatsApp shows a rich card.

## Part 3: Load the launch listings

### 3a. Admin tools (needed to present to each NGO)
Add to `/admin`:
- **Add NGO** and **Add activity for an NGO**, using the same fields as sign-up and `/dashboard/new`. Each record has an "Approved now" toggle.
- **Edit / hide / delete** for any NGO, activity or booking.
- **"Open dashboard as this NGO":** shows that NGO's dashboard exactly as they'd see it (Who's coming, Mark who came). A small bar at the top reads "Viewing as {NGO name} · Exit". This is how we demo each NGO their own page.
- **"Open My plans as this volunteer":** same idea for volunteers.

### 3b. Import script: `scripts/import-listings.ts`
`package.json`:
```
"listings:import": "tsx scripts/import-listings.ts data/listings.json",
"listings:check":  "tsx scripts/import-listings.ts data/listings.json --dry-run"
```

**What the script does with `listings.json`:**

1. **`ngos[]`:** create or update an approved organisation, matched by `key`.
   - Use `name`, `city` (or `city_other` when `city` is "Other"), `causes` and `about`.
   - Create a coordinator account from `coordinator.name` / `coordinator.role` with email `{key}@showup.test`, linked as owner.
   - `interview_id` is stored for our reference only and is **never shown** in the app.
2. **`ngos[].activities[]`:**
   - Create the activity; the slug is `{ngo key}-{activity key}`.
   - `repeats_weekly: n` means n weekly occurrences from `date` (0 = one-off).
   - Address and online link as given. If `mode` is online, the link is a placeholder `https://meet.google.com/` until the NGO adds theirs.
   - `past: true` means the activity already happened and is shown under past activities.
3. **`volunteers[]`, `team_volunteers[]`, `persona_volunteers[]`:**
   - Create a volunteer account per person with their `name`, `email` (all `@showup.test`), city or town and saved causes.
   - Create each listed booking on occurrence number `occurrence` with its `status`:
     - `saved`
     - `confirmed`
     - `freed_early` (store `reason`)
     - `came` (past activities only)
4. **Every record created by the script gets `is_seed = true`.**
   - **No emails are ever sent** to `@showup.test` addresses or about `is_seed` bookings. Add the guard in the email sender itself, not just the script.
   - Seed bookings are excluded from the admin metric.
5. **Safety and output:**
   - Running the script twice must not create duplicates (upsert by keys).
   - `--dry-run` prints what would change and writes nothing.
   - It prints a summary at the end, plus a **warning list** of anything still to confirm: any NGO with `name_confirmed: false`, and any field containing `CONFIRM`.

### 3c. Before presenting
Fill these in `listings.json`, then run `npm run listings:import` again:
- **Exact NGO names** for: Sarthak's education NGO (ask Gautam), Kritika's domestic workers' trust (ask Gautam), Kavita's community learning centre (ask Aditya), Aryan's youth NGO (ask Bhavarth). Set `name_confirmed: true` for each.
- **Hands to Care:** city and the drive's address (ask Bhavarth).
- **Any real dates, addresses or contact names** the NGOs gave you. Replace the ones in the file.

## Part 4: Check before calling it done
- [ ] `npm run listings:check`, then `npm run listings:import` → 10 NGOs, 17 activities, 28 volunteers. Running again changes nothing.
- [ ] The home page lists all upcoming activities.
  - "Teaching" filters correctly.
  - "Online" shows Anweshan, Kritika's brief, Kavita's online English and the OSSPM career talk.
  - "Other places" shows Shimla, Maharashtra and the Hands to Care drive.
- [ ] Admin → "Open dashboard as Gyankunj Foundation" → Who's coming shows Divyansh (saved) and Pranshu (confirmed).
- [ ] Admin → "Open dashboard as Kavita's community learning centre" → the past reading circle shows all 6 team members as Came, and their track records read "Came 1 of 1 times".
- [ ] Admin → "Open My plans as Akanksha" → online English shows "Freed (Work came up)", and the spot is open again on the activity page.
- [ ] On a phone, a new real account: open "Help at our family health check-up day" → Save my spot → enter name and phone → it appears in My plans → "I can't make it" → the spot count goes back up.
- [ ] No email was sent to any `@showup.test` address (check the email provider's log).
- [ ] An activity link pasted in WhatsApp shows a rich preview. `/dashboard` signed out redirects. A bad URL shows the styled 404.
