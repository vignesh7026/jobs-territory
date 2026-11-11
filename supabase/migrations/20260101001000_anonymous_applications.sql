-- Anonymous, skills-first applications. A candidate can choose to hide their name, college, employers and resume
-- from reviewers until they are shortlisted. This is enforced in the database, not just in the page:
-- while an anonymous application has not reached Shortlisted, an admin cannot read that candidate's profile row or
-- resume file at all, and sees only a stripped view through blind_profile().

alter table public.applications add column anonymous boolean not null default false;
-- Chosen once, when applying. Never updatable afterwards, so it cannot be flipped to reveal or hide mid-review.
grant insert (anonymous) on public.applications to authenticated;

-- true while any of this candidate's anonymous applications has not yet been shortlisted
create function public.is_blind_candidate(p_candidate uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.applications a
    where a.candidate_id = p_candidate
      and a.anonymous
      and not exists (select 1 from public.application_events e where e.application_id = a.id and e.status in ('shortlisted', 'interview', 'offered'))
  );
$$;
revoke all on function public.is_blind_candidate(uuid) from public, anon;
grant execute on function public.is_blind_candidate(uuid) to authenticated;

drop policy "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (public.is_admin() and not public.is_blind_candidate(id)));

drop policy "resumes: owner can read" on storage.objects;
create policy "resumes: owner can read" on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (
        public.is_admin()
        and not ((storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                 and public.is_blind_candidate(((storage.foldername(name))[1])::uuid))
      )
    )
  );

-- What a reviewer may see of a blind application: skills, job titles and periods (no employers), degrees and years
-- (no colleges). Admin only.
create function public.blind_profile(p_application_id uuid)
returns table (skills text[], roles jsonb, degrees jsonb)
language plpgsql stable security definer set search_path = public as $$
declare
  cand uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review applications' using errcode = '42501';
  end if;
  select candidate_id into cand from public.applications where id = p_application_id;
  if cand is null then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  return query
    select p.skills,
           coalesce((select jsonb_agg(jsonb_build_object('title', e ->> 'title', 'period', e ->> 'period', 'description', e ->> 'description')) from jsonb_array_elements(p.experience) e), '[]'::jsonb),
           coalesce((select jsonb_agg(jsonb_build_object('degree', e ->> 'degree', 'year', e ->> 'year')) from jsonb_array_elements(p.education) e), '[]'::jsonb)
    from public.profiles p where p.id = cand;
end $$;
revoke all on function public.blind_profile(uuid) from public, anon;
grant execute on function public.blind_profile(uuid) to authenticated;
