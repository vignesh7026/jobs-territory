-- A candidate may only reference files inside their own storage folder, and the JSON columns must be arrays.
-- (Storage policies already stop them reading other folders; this stops a profile pointing at someone else's file.)
alter table public.profiles
  add constraint profiles_resume_path_own_folder check (resume_path is null or resume_path like id::text || '/%'),
  add constraint profiles_experience_is_array check (jsonb_typeof(experience) = 'array' and jsonb_array_length(experience) <= 15),
  add constraint profiles_education_is_array check (jsonb_typeof(education) = 'array' and jsonb_array_length(education) <= 10);
