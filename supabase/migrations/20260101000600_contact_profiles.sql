-- Contact profiles live inside the product (/people/<slug>) instead of pointing at an external site.
alter table public.company_contacts drop column profile_url;
alter table public.company_contacts
  add column slug text,
  add column background text not null default '';
update public.company_contacts set slug = id::text where slug is null;
alter table public.company_contacts alter column slug set not null;
alter table public.company_contacts add constraint company_contacts_slug_key unique (slug);
alter table public.company_contacts add constraint company_contacts_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,80}$');

-- How quickly a company replies, from real status changes. Only aggregates leave the function, never anyone's
-- application. A reply is the first status after "applied".
create function public.company_response(p_slug text)
returns table (applications bigint, replied bigint, median_hours numeric)
language sql stable security definer set search_path = public as $$
  with per_app as (
    select a.id,
           extract(epoch from (min(e.created_at) filter (where e.status <> 'applied') - a.created_at)) / 3600 as hours
    from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.companies c on c.id = j.company_id
    left join public.application_events e on e.application_id = a.id
    where c.slug = p_slug
    group by a.id, a.created_at
  )
  select count(*), count(hours), (percentile_cont(0.5) within group (order by hours))::numeric from per_app;
$$;
revoke all on function public.company_response(text) from public, anon;
grant execute on function public.company_response(text) to authenticated;
