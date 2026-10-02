# Prompts used to build Show-Up (for Appendix A.3)

The app was built in one Claude Code session (model: Claude Opus), not Codex, on 2 Oct 2026.

## Prompts typed by the team

1. *(attached `ShowUp_PRD.md`, no other text)*
2. Answer to "What do you want me to do with it?" → **"Build it here"**

That is the full list. The PRD itself was the prompt: Claude read it and worked through the nine
milestones in §15 in order, committing after each one.

## What each milestone amounted to (the PRD §15 text Claude followed)

1. **Foundation:** Next.js app, Tailwind, shadcn, Supabase schema (§7), RLS, mode flag, design tokens, landing page.
2. **NGO side core:** NGO join plus admin approval; task template (F1) with live preview; share link with Open Graph; public task page (F2).
3. **Volunteer core:** phone check (F3), booking, My bookings, confirm-and-release loop (F4) with scheduled jobs and the message preview (proto) or email plus the admin WhatsApp queue (MVP1).
4. **Attendance and records:** attendance marking (F5), reliability record (F6), turnout view (F7).
5. **Trust layer (proto):** ID verification simulation and trust levels (F8), minimum trust per task (F14), consequences (F13), applicant profiles (Screen 8).
6. **Discovery and NGO trust (proto):** feed with filters (F9), verified NGO profile (F10), guaranteed response (F15), ratings (F17).
7. **Retention and cover (proto):** standby cover (F11), re-engagement nudges (F12), reliability level, streak and hours (F16).
8. **Test Lab (proto):** scenarios SH1–SH7, simulated clock, facilitator forms, CSV export.
9. **Admin metrics and polish:** MVP1 metrics page, exports, accessibility pass, seed data finalised.

The commit history (`git log --oneline`) has one commit per milestone.
