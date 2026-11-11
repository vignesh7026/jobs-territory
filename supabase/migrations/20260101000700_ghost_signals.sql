-- Signals for "is this listing real and current?". first_posted_at is when the job first went up; posted_at moves
-- forward each time it is reposted. is_vague is computed from the text, so it can never drift from the content.
alter table public.jobs
  add column first_posted_at timestamptz,
  add column repost_count integer not null default 0 check (repost_count >= 0),
  add column is_vague boolean generated always as (
    char_length(summary) < 70 or cardinality(skills) = 0 or cardinality(responsibilities) + cardinality(requirements) < 3
  ) stored;
