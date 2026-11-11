-- Anonymous interview experiences, shared by people who applied to a company, read by everyone signed in.
-- Authors are never exposed: readers use the peer_insights view, which has no author column.
create type public.insight_outcome as enum ('offer', 'rejected', 'no_answer', 'withdrew');

create table public.interview_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- null only for the demo sample notes; real notes always carry their author
  author_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  role_title text not null check (char_length(role_title) between 2 and 120),
  rounds integer not null check (rounds between 1 and 8),
  difficulty integer not null check (difficulty between 1 and 5),
  outcome public.insight_outcome not null,
  experience text not null check (char_length(experience) between 30 and 1500),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
-- one note per person per company
create unique index interview_insights_one_per_author on public.interview_insights (author_id, company_id) where author_id is not null;
create index interview_insights_company_idx on public.interview_insights (company_id, created_at desc);

alter table public.interview_insights enable row level security;
revoke all on public.interview_insights from anon, authenticated;
grant select, insert, delete on public.interview_insights to authenticated;

-- You can only see, add or remove your own rows in the table itself.
create policy "own insights" on public.interview_insights for select to authenticated using (author_id = (select auth.uid()));
create policy "delete own insight" on public.interview_insights for delete to authenticated using (author_id = (select auth.uid()));
-- You can share a note about a company only if you have applied to one of its jobs.
create policy "share after applying" on public.interview_insights for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not is_sample
    and exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.candidate_id = (select auth.uid()) and j.company_id = interview_insights.company_id
    )
  );

-- What everyone signed in reads: no author, and whether a row is yours (so you can remove it).
create view public.peer_insights as
  select i.id, i.company_id, i.role_title, i.rounds, i.difficulty, i.outcome, i.experience, i.is_sample, i.created_at,
         (i.author_id = auth.uid()) as mine
  from public.interview_insights i;
revoke all on public.peer_insights from anon, authenticated;
grant select on public.peer_insights to authenticated;
