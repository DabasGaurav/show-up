-- Row Level Security (PRD §7, §13). The Next.js server uses the service role and
-- enforces the same rules in code; these policies protect direct client access.
-- Rows in `users` share their id with auth.users, so auth.uid() is the user id.

create function is_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin');
$$;

create function is_org_member(org uuid) returns boolean
language sql stable security definer as $$
  select exists (select 1 from org_members where org_id = org and user_id = auth.uid());
$$;

create function occurrence_org(occ uuid) returns uuid
language sql stable security definer as $$
  select t.org_id from task_occurrences o join tasks t on t.id = o.task_id where o.id = occ;
$$;

alter table users            enable row level security;
alter table organisations    enable row level security;
alter table org_members      enable row level security;
alter table tasks            enable row level security;
alter table task_occurrences enable row level security;
alter table bookings         enable row level security;
alter table standby          enable row level security;
alter table standby_offers   enable row level security;
alter table ratings          enable row level security;
alter table notifications    enable row level security;
alter table events           enable row level security;
alter table lab_sessions     enable row level security;
alter table app_state        enable row level security;

-- users: own row only. NGO members never read this table directly; applicant
-- cards are served by the server, which hides phone numbers until a booking is
-- accepted or confirmed (§6.1 Screen 8).
create policy users_self_select on users for select using (id = auth.uid() or is_admin());
create policy users_self_update on users for update using (id = auth.uid()) with check (id = auth.uid());

-- organisations: approved ones are public; members and admins see their own.
create policy orgs_public_select on organisations for select
  using (status = 'approved' or is_org_member(id) or is_admin());
create policy orgs_member_update on organisations for update
  using (is_org_member(id) or is_admin());

create policy org_members_select on org_members for select
  using (user_id = auth.uid() or is_org_member(org_id) or is_admin());

-- tasks: published tasks are public; drafts are visible to the organisation.
create policy tasks_public_select on tasks for select
  using (status in ('published','closed') or is_org_member(org_id) or is_admin());
create policy tasks_member_write on tasks for all
  using (is_org_member(org_id) or is_admin())
  with check (is_org_member(org_id) or is_admin());

create policy occurrences_select on task_occurrences for select using (true);
create policy occurrences_member_write on task_occurrences for all
  using (is_org_member((select org_id from tasks where id = task_id)) or is_admin())
  with check (is_org_member((select org_id from tasks where id = task_id)) or is_admin());

-- bookings: volunteers see their own; NGO members see bookings for their tasks.
create policy bookings_select on bookings for select
  using (user_id = auth.uid() or is_org_member(occurrence_org(occurrence_id)) or is_admin());
create policy bookings_volunteer_insert on bookings for insert with check (user_id = auth.uid());
create policy bookings_update on bookings for update
  using (user_id = auth.uid() or is_org_member(occurrence_org(occurrence_id)) or is_admin());

create policy standby_own on standby for all
  using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid());

create policy standby_offers_select on standby_offers for select
  using (user_id = auth.uid() or is_org_member(occurrence_org(occurrence_id)) or is_admin());
create policy standby_offers_update on standby_offers for update using (user_id = auth.uid());

create policy ratings_select on ratings for select using (true);

create policy notifications_own on notifications for select using (user_id = auth.uid() or is_admin());

-- events: anyone may write analytics; only admins read.
create policy events_insert on events for insert with check (true);
create policy events_admin_select on events for select using (is_admin());

create policy lab_admin on lab_sessions for all using (is_admin()) with check (is_admin());
create policy app_state_admin on app_state for all using (is_admin()) with check (is_admin());
