-- Optional short cover note on automatic applications (built from the candidate's real matching skills, no AI).
alter table public.auto_apply_rules add column include_note boolean not null default false;
