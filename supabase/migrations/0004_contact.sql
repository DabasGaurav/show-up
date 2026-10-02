-- "Write to us": messages from the contact page, read by the team in /admin.
create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete set null,
  name       text not null,
  email      text not null,
  message    text not null,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;
