-- Jobs Territory: core schema. Row-level security lives in the next migration.

create type public.app_role as enum ('candidate', 'admin');
create type public.application_status as enum ('applied', 'under_review', 'shortlisted', 'interview', 'offered', 'rejected');
create type public.work_mode as enum ('onsite', 'hybrid', 'remote');
create type public.job_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type public.job_level as enum ('intern', 'junior', 'mid', 'senior', 'lead');

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or char_length(phone) <= 24),
  location text check (location is null or char_length(location) <= 120),
  headline text check (headline is null or char_length(headline) <= 160),
  summary text check (summary is null or char_length(summary) <= 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 40),
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  resume_path text,
  -- bumped on every content edit; AI results are cached per (job, profile_version)
  profile_version integer not null default 1,
  role public.app_role not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- companies / jobs
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  industry text not null,
  size text not null,
  hq text not null,
  about text not null
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  location text not null,
  work_mode public.work_mode not null,
  job_type public.job_type not null,
  level public.job_level not null,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  currency char(3) not null default 'INR',
  summary text not null,
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  skills text[] not null default '{}',
  posted_at timestamptz not null default now(),
  closes_at timestamptz,
  search tsvector,
  check (salary_max is null or salary_min is null or salary_max >= salary_min)
);
create index jobs_posted_at_idx on public.jobs (posted_at desc);
create index jobs_filters_idx on public.jobs (work_mode, job_type, level);
create index jobs_search_idx on public.jobs using gin (search);

-- Weighted full-text document: title > skills > company/location > summary.
-- A trigger (not a generated column) because the company name lives in another table.
create function public.jobs_search_refresh() returns trigger
language plpgsql set search_path = public as $$
begin
  new.search :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(new.skills, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce((select name from public.companies where id = new.company_id), '') || ' ' || coalesce(new.location, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'D');
  return new;
end $$;
create trigger jobs_search_refresh before insert or update on public.jobs
  for each row execute function public.jobs_search_refresh();

-- ---------------------------------------------------------------- applications
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  cover_note text check (cover_note is null or char_length(cover_note) <= 3000),
  status public.application_status not null default 'applied',
  resume_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one application per candidate per job; 23505 is mapped to HTTP 409 "Already applied"
  constraint applications_one_per_job unique (candidate_id, job_id)
);
create index applications_candidate_idx on public.applications (candidate_id, updated_at desc);
create index applications_status_idx on public.applications (status, updated_at desc);

create table public.application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  status public.application_status not null,
  note text,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

-- ---------------------------------------------------------------- saved items
create table public.saved_jobs (
  candidate_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  query jsonb not null,
  created_at timestamptz not null default now()
);
create index saved_searches_candidate_idx on public.saved_searches (candidate_id, created_at desc);

-- ---------------------------------------------------------------- AI cache (server-only)
create table public.ai_cache (
  key text primary key,
  kind text not null,
  job_id uuid references public.jobs (id) on delete cascade,
  profile_version integer,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index ai_cache_job_idx on public.ai_cache (job_id, kind);

-- ---------------------------------------------------------------- triggers
-- New auth user -> profile row. The role is NEVER taken from user metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bump profile_version only when content that feeds AI results changes.
create function public.profiles_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if (new.headline, new.summary, new.skills, new.experience, new.education, new.location)
     is distinct from (old.headline, old.summary, old.skills, old.experience, old.education, old.location) then
    new.profile_version := old.profile_version + 1;
  end if;
  return new;
end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- Snapshot the resume at apply time and write the first timeline event, in the same transaction.
create function public.applications_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.resume_path is null then
    select resume_path into new.resume_path from public.profiles where id = new.candidate_id;
  end if;
  return new;
end $$;
create trigger applications_before_insert before insert on public.applications
  for each row execute function public.applications_before_insert();

create function public.applications_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.application_events (application_id, status, note, actor_id, created_at)
  values (new.id, new.status, 'Application submitted', new.candidate_id, new.created_at);
  return new;
end $$;
create trigger applications_after_insert after insert on public.applications
  for each row execute function public.applications_after_insert();
