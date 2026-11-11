-- Undo for a mistaken application. Candidates cannot delete applications directly (no DELETE grant), because
-- history must not be erasable once a recruiter has acted. This function allows it only while nothing has happened yet:
-- the application is still 'applied' and was submitted in the last 10 minutes.
create function public.undo_application(p_application_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  app public.applications;
begin
  select * into app from public.applications where id = p_application_id and candidate_id = auth.uid() for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if app.status <> 'applied' or app.created_at < now() - interval '10 minutes' then
    raise exception 'This application can no longer be undone' using errcode = '22023';
  end if;
  delete from public.applications where id = app.id; -- events cascade
end $$;

revoke all on function public.undo_application(uuid) from public, anon;
grant execute on function public.undo_application(uuid) to authenticated;
