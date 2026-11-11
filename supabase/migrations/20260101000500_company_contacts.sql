-- People a candidate can contact about a company's jobs: one founder and one recruiter per company.
-- Contact details are only for signed-in candidates, so anonymous visitors and scrapers cannot read them.
create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('founder', 'recruiter')),
  full_name text not null,
  title text not null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  profile_url text not null check (profile_url ~* '^https://'),
  unique (company_id, kind)
);

alter table public.company_contacts enable row level security;
revoke all on public.company_contacts from anon, authenticated;
grant select on public.company_contacts to authenticated;
create policy "signed-in candidates can read contacts" on public.company_contacts for select to authenticated using (true);
