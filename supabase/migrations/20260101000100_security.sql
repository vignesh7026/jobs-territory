-- Row-level security, column grants, the admin status RPC, and resume storage rules.
-- Principle: grants are as narrow as possible (defence in depth), then RLS decides which rows.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.saved_searches enable row level security;
alter table public.ai_cache enable row level security;

-- ------------------------------------------------------------ table privileges
-- Start from nothing for the API roles, then add back only what the product needs.
revoke all on public.profiles, public.companies, public.jobs, public.applications, public.application_events,
              public.saved_jobs, public.saved_searches, public.ai_cache from anon, authenticated;

grant select on public.companies, public.jobs to anon, authenticated;

grant select on public.profiles to authenticated;
-- role, id, profile_version and timestamps are deliberately NOT updatable by a candidate.
grant update (full_name, phone, location, headline, summary, skills, experience, education, resume_path) on public.profiles to authenticated;

grant select on public.applications to authenticated;
-- status is never client-writable: it defaults to 'applied' and only the admin RPC changes it.
grant insert (job_id, cover_note) on public.applications to authenticated;

grant select on public.application_events to authenticated;

grant select, insert, delete on public.saved_jobs to authenticated;
grant select, insert, update, delete on public.saved_searches to authenticated;
-- ai_cache: no grants at all. Only the service role (server routes) can touch it.

-- ------------------------------------------------------------ policies
create policy "jobs are public" on public.jobs for select to anon, authenticated using (true);
create policy "companies are public" on public.companies for select to anon, authenticated using (true);

create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "read own applications or admin" on public.applications for select to authenticated
  using (candidate_id = (select auth.uid()) or public.is_admin());
create policy "apply as myself to open jobs" on public.applications for insert to authenticated
  with check (
    candidate_id = (select auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and (j.closes_at is null or j.closes_at > now()))
  );

create policy "read events of own applications or admin" on public.application_events for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.applications a where a.id = application_id and a.candidate_id = (select auth.uid()))
  );

create policy "own saved jobs" on public.saved_jobs for all to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));
create policy "own saved searches" on public.saved_searches for all to authenticated
  using (candidate_id = (select auth.uid())) with check (candidate_id = (select auth.uid()));

-- ------------------------------------------------------------ admin status change
-- Allowed moves. 'rejected' is terminal; offers can still be withdrawn (offered -> rejected).
create function public.application_transition_allowed(p_from public.application_status, p_to public.application_status)
returns boolean language sql immutable as $$
  select case p_from
    when 'applied'      then p_to in ('under_review', 'rejected')
    when 'under_review' then p_to in ('shortlisted', 'rejected')
    when 'shortlisted'  then p_to in ('interview', 'rejected')
    when 'interview'    then p_to in ('offered', 'rejected')
    when 'offered'      then p_to = 'rejected'
    else false
  end
$$;

-- Status update + timeline event happen atomically, and only for admins.
create function public.admin_set_application_status(
  p_application_id uuid, p_status public.application_status, p_note text default null
) returns public.applications
language plpgsql security definer set search_path = public as $$
declare
  app public.applications;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change application status' using errcode = '42501';
  end if;

  select * into app from public.applications where id = p_application_id for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if not public.application_transition_allowed(app.status, p_status) then
    raise exception 'Cannot move an application from % to %', app.status, p_status using errcode = '22023';
  end if;

  update public.applications set status = p_status, updated_at = now() where id = p_application_id returning * into app;
  insert into public.application_events (application_id, status, note, actor_id)
  values (app.id, p_status, nullif(btrim(p_note), ''), auth.uid());
  return app;
end $$;
revoke all on function public.admin_set_application_status(uuid, public.application_status, text) from public, anon;
grant execute on function public.admin_set_application_status(uuid, public.application_status, text) to authenticated;

-- ------------------------------------------------------------ resume storage
-- Private bucket, PDF only, 2 MB. Files live under "<user id>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 2097152, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['application/pdf'];

create policy "resumes: owner can upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes: owner can read" on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "resumes: owner can replace" on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resumes: owner can delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
