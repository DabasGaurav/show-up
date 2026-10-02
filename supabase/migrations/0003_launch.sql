-- Launch listings and the fixes that came with them.

-- Records loaded by scripts/import-listings.ts. They never get email, and their
-- spots are left out of the admin number.
alter table users            add column if not exists is_seed boolean not null default false;
alter table organisations    add column if not exists is_seed boolean not null default false;
alter table tasks            add column if not exists is_seed boolean not null default false;
alter table task_occurrences add column if not exists is_seed boolean not null default false;
alter table bookings         add column if not exists is_seed boolean not null default false;

-- Our own references. Never shown in the app.
alter table users         add column if not exists interview_id text;
alter table organisations add column if not exists interview_id text;
alter table organisations add column if not exists import_key text unique;

-- NGO sign-up additions.
alter table organisations add column if not exists whatsapp_phone text;
alter table organisations add column if not exists heard_from text;

-- "Tell me when something's on."
create table if not exists waitlist_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  -- What the person was looking for, e.g. "cause=food&city=pune".
  filters    text not null default '',
  created_at timestamptz not null default now(),
  unique (email, filters)
);
alter table waitlist_emails enable row level security;
