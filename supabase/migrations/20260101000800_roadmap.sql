-- A candidate's learning plan toward one target role: one row per week-task, ticked off as they go.
-- Only the person who owns a plan can see or change it.
create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target text not null check (char_length(target) between 1 and 160),
  week integer not null check (week between 1 and 12),
  skill text not null check (char_length(skill) between 1 and 60),
  task text not null check (char_length(task) between 1 and 300),
  resource_title text not null check (char_length(resource_title) <= 120),
  resource_url text not null check (resource_url ~ '^https://'),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index roadmap_items_candidate_idx on public.roadmap_items (candidate_id, week);

alter table public.roadmap_items enable row level security;
revoke all on public.roadmap_items from anon, authenticated;
grant select, insert, delete on public.roadmap_items to authenticated;
grant update (done) on public.roadmap_items to authenticated;
create policy "own roadmap" on public.roadmap_items for all to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));
