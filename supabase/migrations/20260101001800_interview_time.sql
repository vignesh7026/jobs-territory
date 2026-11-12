-- The candidate records when their interview is. Only they can set it (the column is not in any insert grant and
-- there is no update policy), and only once the application has reached Shortlisted or Interview.
alter table public.applications add column interview_at timestamptz;

create function public.set_interview_time(p_application uuid, p_at timestamptz) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  a public.applications;
begin
  select * into a from public.applications where id = p_application and candidate_id = auth.uid() for update;
  if not found then
    raise exception 'application not found' using errcode = 'P0002';
  end if;
  if p_at is not null then
    if a.status not in ('shortlisted', 'interview') then
      raise exception 'an interview time can be set once you are shortlisted' using errcode = '22023';
    end if;
    if p_at < now() - interval '1 day' or p_at > now() + interval '180 days' then
      raise exception 'that date is out of range' using errcode = '22008';
    end if;
  end if;
  update public.applications set interview_at = p_at where id = p_application;
  return p_at;
end;
$$;
revoke all on function public.set_interview_time(uuid, timestamptz) from public, anon;
grant execute on function public.set_interview_time(uuid, timestamptz) to authenticated;
