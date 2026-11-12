-- Job alerts for saved searches: remember when the candidate last looked, so the Saved page can say how many
-- matching jobs were posted since. Existing searches start from now, so nothing old is reported as new.
alter table public.saved_searches add column last_seen_at timestamptz not null default now();
