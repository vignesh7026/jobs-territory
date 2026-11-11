-- Referral finder: people who work at a company (so alumni can be matched), and the candidate's own list of
-- people they know there. Employees are demo data; connections are private to the candidate who added them.

create table public.company_employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  title text not null check (char_length(title) between 2 and 120),
  college text not null check (char_length(college) between 2 and 160),
  grad_year integer check (grad_year between 1980 and 2100)
);
create index company_employees_company_idx on public.company_employees (company_id);
alter table public.company_employees enable row level security;
revoke all on public.company_employees from anon, authenticated;
grant select on public.company_employees to authenticated;
create policy "signed-in candidates can read employees" on public.company_employees for select to authenticated using (true);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  relationship text not null check (relationship in ('colleague', 'friend', 'classmate', 'former manager', 'family')),
  created_at timestamptz not null default now()
);
create index connections_candidate_idx on public.connections (candidate_id, company_id);
alter table public.connections enable row level security;
revoke all on public.connections from anon, authenticated;
grant select, insert, delete on public.connections to authenticated;
create policy "own connections" on public.connections for all to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));
