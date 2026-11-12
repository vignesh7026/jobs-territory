-- Reports: a candidate can flag a job, a company or an interview note. Admins work a queue. Three different people
-- reporting the same interview note hides it automatically until an admin looks (notes are anonymous, so there is no
-- other way to take down something abusive quickly).
create type public.report_kind as enum ('job', 'company', 'insight');
create type public.report_reason as enum ('fake_company', 'asks_for_money', 'misleading', 'abusive', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

alter table public.interview_insights add column hidden boolean not null default false;
create or replace view public.peer_insights as
  select i.id, i.company_id, i.role_title, i.rounds, i.difficulty, i.outcome, i.experience, i.is_sample, i.created_at,
         (i.author_id = auth.uid()) as mine
  from public.interview_insights i
  where not i.hidden;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.report_kind not null,
  target_id uuid not null,
  reason public.report_reason not null,
  detail text check (detail is null or char_length(detail) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  -- one report per person per target: no flooding
  constraint reports_one_per_reporter unique (reporter_id, kind, target_id)
);
create index reports_open_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (kind, target_id);

alter table public.reports enable row level security;
revoke all on public.reports from public, anon, authenticated;
grant select on public.reports to authenticated;
grant insert (kind, target_id, reason, detail) on public.reports to authenticated;
create policy "read own reports or admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "report as myself" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));

-- The target must exist, and you cannot report your own interview note. Then the auto-hide rule runs.
create function public.reports_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'job' and not exists (select 1 from public.jobs where id = new.target_id) then
    raise exception 'job not found' using errcode = '23503';
  elsif new.kind = 'company' and not exists (select 1 from public.companies where id = new.target_id) then
    raise exception 'company not found' using errcode = '23503';
  elsif new.kind = 'insight' then
    if not exists (select 1 from public.interview_insights where id = new.target_id) then
      raise exception 'note not found' using errcode = '23503';
    end if;
    if exists (select 1 from public.interview_insights where id = new.target_id and author_id = new.reporter_id) then
      raise exception 'you cannot report your own note' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
create trigger reports_before_insert before insert on public.reports for each row execute function public.reports_before_insert();

create function public.reports_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'insight' and (
    select count(distinct reporter_id) from public.reports where kind = 'insight' and target_id = new.target_id and status = 'open'
  ) >= 3 then
    update public.interview_insights set hidden = true where id = new.target_id;
  end if;
  return new;
end;
$$;
create trigger reports_after_insert after insert on public.reports for each row execute function public.reports_after_insert();

-- Admin decision. 'dismiss' closes the report (and un-hides a note the auto-rule hid). 'action' acts on the target:
-- hide the note, remove a company's verification, or close the job listing. Everything is recorded on the report.
create function public.admin_resolve_report(p_report uuid, p_action text) returns public.reports
language plpgsql security definer set search_path = public as $$
declare
  r public.reports;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;
  if p_action not in ('dismiss', 'action') then
    raise exception 'unknown action' using errcode = '22023';
  end if;
  select * into r from public.reports where id = p_report for update;
  if not found then
    raise exception 'report not found' using errcode = 'P0002';
  end if;

  if p_action = 'action' then
    if r.kind = 'insight' then
      update public.interview_insights set hidden = true where id = r.target_id;
    elsif r.kind = 'company' then
      update public.companies set verified = false, verified_at = null, verification_note = null where id = r.target_id;
    else
      update public.jobs set closes_at = now() where id = r.target_id and (closes_at is null or closes_at > now());
    end if;
  elsif r.kind = 'insight' then
    update public.interview_insights set hidden = false where id = r.target_id;
  end if;

  -- every open report on the same target gets the same outcome
  update public.reports
     set status = case when p_action = 'action' then 'actioned'::public.report_status else 'dismissed'::public.report_status end,
         resolved_at = now(), resolved_by = auth.uid()
   where kind = r.kind and target_id = r.target_id and status = 'open';
  select * into r from public.reports where id = p_report;
  return r;
end;
$$;
revoke all on function public.admin_resolve_report(uuid, text) from public, anon;
grant execute on function public.admin_resolve_report(uuid, text) to authenticated;
