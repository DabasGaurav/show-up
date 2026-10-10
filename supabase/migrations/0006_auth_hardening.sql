-- One account per email, enforced by the database (two sign-ups at the same moment
-- can't both get through). Skipped if duplicates already exist, so it never blocks an update.
do $$
begin
  if not exists (select 1 from users where email is not null group by lower(email) having count(*) > 1) then
    create unique index if not exists users_email_unique on users (lower(email));
  end if;
end $$;

-- Recent sign-in failures and sign-ups, to slow down guessing and bulk sign-ups.
create table if not exists auth_attempts (
  key text not null,
  at  timestamptz not null default now()
);
create index if not exists auth_attempts_key_idx on auth_attempts (key, at);
alter table auth_attempts enable row level security;
