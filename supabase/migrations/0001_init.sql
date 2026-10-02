-- Show-Up schema (PRD §7). Timestamps are stored in UTC and displayed in IST.

create table users (
  id                uuid primary key default gen_random_uuid(),
  role              text not null default 'volunteer' check (role in ('volunteer','ngo_member','admin')),
  name              text not null,
  phone             text unique,
  phone_verified_at timestamptz,
  email             text,
  city              text,
  is_online_ok      boolean not null default true,
  saved_causes      text[] not null default '{}',
  level             text not null default 'new' check (level in ('new','verified','trusted')),
  id_status         text not null default 'none' check (id_status in ('none','pending','approved','rejected')),
  created_at        timestamptz not null default now(),
  last_active_at    timestamptz not null default now()
);

create table organisations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'ngo' check (type in ('ngo','college','company','community')),
  name            text not null,
  slug            text not null unique,
  city            text not null,
  causes          text[] not null default '{}',
  registration_no text,
  tax_12a_80g     text,
  verified_at     timestamptz,
  about           text,
  photos          text[] not null default '{}',
  contact_name    text,
  contact_phone   text,
  invite_code     text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now()
);

create table org_members (
  org_id  uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role    text not null default 'coordinator' check (role in ('owner','coordinator')),
  primary key (org_id, user_id)
);

create table tasks (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organisations(id) on delete cascade,
  title           text not null,
  cause           text not null,
  role            text not null,
  done_definition text not null,
  mode            text not null check (mode in ('onsite','online')),
  city            text not null,
  address         text,
  lat             double precision,
  lng             double precision,
  online_link     text,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  duration_min    integer not null,
  commitment      text not null default 'one_off' check (commitment in ('one_off','recurring')),
  recurrence_rule text,
  occurrences     integer not null default 1,
  slots_needed    integer not null check (slots_needed > 0),
  min_trust       text not null default 'everyone' check (min_trust in ('everyone','verified','trusted')),
  booking_mode    text not null default 'instant' check (booking_mode in ('instant','approval')),
  contact_name    text not null,
  contact_role    text not null,
  contact_phone   text not null,
  share_slug      text not null unique,
  status          text not null default 'draft' check (status in ('draft','published','closed')),
  created_at      timestamptz not null default now()
);

-- One row per date for recurring tasks; one-off tasks have exactly one.
create table task_occurrences (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid not null references tasks(id) on delete cascade,
  start_at timestamptz not null,
  end_at   timestamptz not null
);
create index task_occurrences_task_idx on task_occurrences(task_id, start_at);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  occurrence_id  uuid not null references task_occurrences(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  status         text not null default 'booked' check (status in (
                   'requested','booked','awaiting_confirmation','confirmed',
                   'released_early','released_late','attended','no_show',
                   'not_recorded','declined','auto_released')),
  source         text not null default 'link' check (source in ('link','feed','standby','admin')),
  confirm_token  text not null unique,
  confirmed_at   timestamptz,
  released_at    timestamptz,
  release_reason text check (release_reason in ('work','health','travel','other')),
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index bookings_occurrence_idx on bookings(occurrence_id);
create index bookings_user_idx on bookings(user_id);
-- One live booking per volunteer per occurrence (§5.2); released ones may rebook.
create unique index bookings_one_active_per_user on bookings(occurrence_id, user_id)
  where status not in ('released_early','released_late','declined','auto_released');

create table standby (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users(id) on delete cascade,
  date      date not null,
  city      text,
  is_online boolean not null default false,
  causes    text[] not null default '{}',
  active    boolean not null default true
);

create table standby_offers (
  id                  uuid primary key default gen_random_uuid(),
  booking_released_id uuid not null references bookings(id) on delete cascade,
  occurrence_id       uuid not null references task_occurrences(id) on delete cascade,
  user_id             uuid not null references users(id) on delete cascade,
  sent_at             timestamptz not null default now(),
  expires_at          timestamptz not null,
  status              text not null default 'sent' check (status in ('sent','accepted','declined','expired','taken'))
);

create table ratings (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  rater_type text not null check (rater_type in ('ngo','volunteer')),
  score      integer not null check (score between 1 and 5),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (booking_id, rater_type)
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  type       text not null,
  channel    text not null check (channel in ('sms','whatsapp','email','in_app')),
  payload    jsonb not null default '{}',
  due_at     timestamptz not null default now(),
  sent_at    timestamptz,
  status     text not null default 'queued' check (status in ('queued','sent','manual_pending','manual_sent')),
  -- Makes scheduled jobs idempotent: the same message is never created twice (§13).
  dedupe_key text unique
);
create index notifications_due_idx on notifications(status, due_at);

create table events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  session_id text,
  name       text not null,
  props      jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index events_name_idx on events(name, created_at);

create table lab_sessions (
  id                uuid primary key default gen_random_uuid(),
  scenario          text not null check (scenario in ('SH1','SH2','SH3','SH4','SH5','SH6','SH7')),
  tester_id         text not null,
  persona           text not null,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  outcome           jsonb not null default '{}',
  facilitator_notes text,
  quote             text
);

-- Key/value settings (e.g. the prototype's simulated "Now" clock).
create table app_state (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------------------
-- Derived values. The app computes these through /lib/rules (so the prototype's
-- simulated clock applies); the views give the same numbers on the real clock
-- for exports and ad-hoc queries.
-- ---------------------------------------------------------------------------

-- §5.5: "booked" excludes early releases and anything not yet resolved.
create view v_reliability as
select
  u.id as user_id,
  count(*) filter (where b.status = 'attended')                               as attended,
  count(*) filter (where b.status in ('attended','no_show','released_late'))  as booked,
  count(*) filter (where b.status = 'released_late')                          as late_releases,
  count(*) filter (where b.status = 'no_show')                                as no_shows
from users u
left join bookings b on b.user_id = u.id
group by u.id;

-- §5.1: Trusted = ID approved + ≥3 attended and 0 no-shows in the last 90 days.
create view v_trust_level as
select
  u.id as user_id,
  case
    when u.id_status = 'approved'
     and count(*) filter (where b.status = 'attended' and o.start_at > now() - interval '90 days') >= 3
     and count(*) filter (where b.status = 'no_show'  and o.start_at > now() - interval '90 days') = 0
      then 'trusted'
    when u.id_status = 'approved' then 'verified'
    else 'new'
  end as level
from users u
left join bookings b on b.user_id = u.id
left join task_occurrences o on o.id = b.occurrence_id
group by u.id, u.id_status;

-- §5.8: share of approval requests answered within 48h over the last 90 days.
create view v_org_response_rate as
select
  t.org_id,
  count(*) as requests,
  count(*) filter (where b.decided_at is not null
                     and b.status <> 'auto_released'
                     and b.decided_at <= b.created_at + interval '48 hours') as answered_in_time
from bookings b
join task_occurrences o on o.id = b.occurrence_id
join tasks t on t.id = o.task_id
where t.booking_mode = 'approval'
  and b.created_at > now() - interval '90 days'
  and (b.decided_at is not null or b.created_at <= now() - interval '48 hours')
group by t.org_id;

-- §6.1 Screen 9 header strip.
create view v_turnout as
select
  o.id as occurrence_id,
  t.slots_needed as needed,
  count(b.id) filter (where b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')) as booked,
  count(b.id) filter (where b.status = 'confirmed')                          as confirmed,
  count(b.id) filter (where b.status in ('booked','awaiting_confirmation'))  as unconfirmed,
  count(b.id) filter (where b.status in ('released_early','released_late'))  as released,
  count(b.id) filter (where b.source = 'standby'
                        and b.status in ('booked','awaiting_confirmation','confirmed','attended','no_show','not_recorded')) as filled_by_standby
from task_occurrences o
join tasks t on t.id = o.task_id
left join bookings b on b.occurrence_id = o.id
group by o.id, t.slots_needed;
