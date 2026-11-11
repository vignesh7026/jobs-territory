-- Job search: salary normalised to INR for sorting, and one function that applies every filter, ranks keyword
-- matches and returns a page of ids plus the total count.

-- Approximate fixed rates, used ONLY to order salaries across currencies. Displayed salaries are always in the job's own currency.
alter table public.jobs add column salary_max_inr bigint generated always as (
  case when salary_max is null then null
       else (salary_max * case currency when 'INR' then 1 when 'USD' then 83 when 'GBP' then 105 when 'EUR' then 90 when 'SGD' then 62 when 'CAD' then 61 else 1 end)::bigint
  end
) stored;

create index jobs_salary_inr_idx on public.jobs (salary_max_inr desc nulls last);

-- Prefix match on every word ("react dev" finds "React Developer"). Only letters and digits survive, so user input
-- can never become tsquery syntax.
create function public.jobs_tsquery(p_q text) returns tsquery
language sql immutable as $$
  select nullif(string_agg(t || ':*', ' & '), '')::tsquery
  from regexp_split_to_table(lower(regexp_replace(coalesce(p_q, ''), '[^[:alnum:]]+', ' ', 'g')), '\s+') as t
  where t <> ''
$$;

-- Order of results: relevance (only meaningful with a keyword), highest salary, or newest (also the tie-breaker).
create function public.search_jobs(
  p_q text default null,
  p_location text default null,
  p_types public.job_type[] default null,
  p_modes public.work_mode[] default null,
  p_levels public.job_level[] default null,
  p_sort text default 'newest',
  p_limit integer default 12,
  p_offset integer default 0
) returns table (total bigint, job_id uuid)
language sql stable set search_path = public as $$
  with q as (select public.jobs_tsquery(p_q) as tsq),
  matched as (
    select j.id, j.posted_at, j.salary_max_inr,
           case when q.tsq is null then 0 else ts_rank(j.search, q.tsq) end as rank
    from public.jobs j cross join q
    where (j.closes_at is null or j.closes_at > now())
      and (q.tsq is null or j.search @@ q.tsq)
      and (nullif(btrim(p_location), '') is null
           or j.location ilike '%' || replace(replace(replace(btrim(p_location), '\', '\\'), '%', '\%'), '_', '\_') || '%')
      and (p_types is null or cardinality(p_types) = 0 or j.job_type = any (p_types))
      and (p_modes is null or cardinality(p_modes) = 0 or j.work_mode = any (p_modes))
      and (p_levels is null or cardinality(p_levels) = 0 or j.level = any (p_levels))
  )
  select count(*) over () as total, m.id as job_id
  from matched m
  order by
    (case when p_sort = 'relevance' then m.rank end) desc nulls last,
    (case when p_sort = 'salary' then m.salary_max_inr end) desc nulls last,
    m.posted_at desc,
    m.id
  limit greatest(1, least(coalesce(p_limit, 12), 50))
  offset greatest(0, coalesce(p_offset, 0))
$$;

grant execute on function public.search_jobs(text, text, public.job_type[], public.work_mode[], public.job_level[], text, integer, integer) to anon, authenticated;
grant execute on function public.jobs_tsquery(text) to anon, authenticated;
