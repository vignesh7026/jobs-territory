-- Company verification. Anyone can post a listing, so candidates need to see which companies have been checked.
-- Only the service role / admin tooling sets these columns; candidates and anonymous visitors can read them.
alter table public.companies
  add column verified boolean not null default false,
  add column verified_at timestamptz,
  add column verification_note text;

alter table public.companies
  add constraint companies_verified_consistent
  check ((verified and verified_at is not null and verification_note is not null) or (not verified));
