-- Sign-in by email and password (no email link needed). Stored as a salted scrypt hash.
alter table users add column if not exists password_hash text;
