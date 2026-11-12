-- Auto-apply. A candidate states which roles and places they want; the server then applies for them within limits they
-- set (match floor, daily cap, verified companies only by default). One rule per candidate, readable and writable
-- only by that candidate. Every automatic application is flagged so it can be shown, and undone like any other.

alter table public.applications add column auto_applied boolean not null default false;
grant insert (auto_applied) on public.applications to authenticated;

create table public.auto_apply_rules (
  candidate_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  roles text[] not null,
  locations text[] not null default '{}',
  include_remote boolean not null default false,
  min_match integer not null default 60 check (min_match between 40 and 100),
  daily_cap integer not null default 3 check (daily_cap between 1 and 10),
  verified_only boolean not null default true,
  enabled boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auto_apply_roles_count check (cardinality(roles) between 1 and 5),
  constraint auto_apply_locations_count check (cardinality(locations) <= 5),
  -- a rule that names no place and not remote would match nothing sensible; require at least one of them
  constraint auto_apply_needs_place check (cardinality(locations) >= 1 or include_remote)
);

alter table public.auto_apply_rules enable row level security;
revoke all on public.auto_apply_rules from public, anon, authenticated;
grant select, insert, update, delete on public.auto_apply_rules to authenticated;

create policy "own rule: read" on public.auto_apply_rules for select to authenticated using (candidate_id = (select auth.uid()));
create policy "own rule: create" on public.auto_apply_rules for insert to authenticated with check (candidate_id = (select auth.uid()));
create policy "own rule: change" on public.auto_apply_rules for update to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));
create policy "own rule: delete" on public.auto_apply_rules for delete to authenticated using (candidate_id = (select auth.uid()));
