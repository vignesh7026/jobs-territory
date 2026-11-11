-- Security tests. Run against a database that has the migrations and seed applied:
--   npm run db:test
-- Everything happens inside one transaction that is rolled back, so the data is untouched.
-- Each check raises an exception on failure, which makes psql exit non-zero.

begin;

-- helpers ---------------------------------------------------------------
create function pg_temp.act_as(uid uuid, r text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', r)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', r);
end $$;

create function pg_temp.reset() returns void language plpgsql as $$
begin
  execute 'reset role';
end $$;

-- run a statement that must fail with the given SQLSTATE
create function pg_temp.expect_error(stmt text, code text, label text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlstate = code then return; end if;
    raise exception 'FAIL [%]: expected SQLSTATE %, got % (%)', label, code, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL [%]: statement succeeded but should have failed with %', label, code;
end $$;

create function pg_temp.check_that(ok boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAIL [%]', label; end if;
  raise notice 'ok   %', label;
end $$;

-- fixtures ---------------------------------------------------------------
-- Second candidate, created the same way the app does it (auth.users insert fires the profile trigger).
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated',
        'other@jobsterritory.example', now(), '{"full_name":"Other Candidate"}', now(), now());

-- anon ------------------------------------------------------------------
select pg_temp.act_as(null, 'anon');
select pg_temp.check_that((select count(*) from public.jobs) >= 30, 'anon can read 30+ jobs');
select pg_temp.check_that((select count(*) from public.companies) >= 10, 'anon can read companies');
select pg_temp.expect_error('select * from public.applications', '42501', 'anon cannot read applications');
select pg_temp.expect_error('select * from public.profiles', '42501', 'anon cannot read profiles');
select pg_temp.expect_error('select * from public.company_contacts', '42501', 'anon cannot read recruiter and founder contacts');
select pg_temp.expect_error($$select * from public.company_response('tamarind-health')$$,'42501', 'anon cannot call the reply-time function');
select pg_temp.reset();

-- candidate: own data only ---------------------------------------------
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select pg_temp.check_that((select count(*) from public.applications) = 6, 'demo candidate sees exactly their 6 applications');
select pg_temp.check_that((select count(*) from public.profiles) = 1, 'candidate sees only their own profile row');
select pg_temp.check_that((select count(*) from public.application_events) >= 6, 'candidate can read events of their own applications');
select pg_temp.expect_error('select * from public.ai_cache', '42501', 'candidate cannot read ai_cache');
select pg_temp.reset();

select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select pg_temp.check_that((select count(*) from public.applications) = 0, 'other candidate sees none of the demo applications');
select pg_temp.check_that((select count(*) from public.application_events) = 0, 'other candidate cannot read demo timeline events');
select pg_temp.check_that((select count(*) from public.profiles) = 1, 'other candidate sees only their own profile');
select pg_temp.reset();

-- candidate: cannot escalate -------------------------------------------
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select pg_temp.expect_error($$update public.profiles set role = 'admin' where id = '33333333-3333-4333-8333-333333333333'$$, '42501', 'candidate cannot make themselves admin');
select pg_temp.expect_error($$update public.profiles set profile_version = 99 where id = '33333333-3333-4333-8333-333333333333'$$, '42501', 'candidate cannot set profile_version');
select pg_temp.expect_error($$update public.applications set status = 'offered'$$, '42501', 'candidate cannot update application status');
select pg_temp.expect_error($$insert into public.application_events (application_id, status) select id, 'offered' from public.applications limit 1$$, '42501', 'candidate cannot write events');
select pg_temp.expect_error($$select public.admin_set_application_status('00000000-0000-0000-0000-000000000000', 'under_review')$$, '42501', 'candidate cannot call the admin RPC');
select pg_temp.reset();

-- candidate: resume path must stay inside their own folder
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
update public.profiles set resume_path = '33333333-3333-4333-8333-333333333333/cv.pdf';
select pg_temp.check_that((select resume_path from public.profiles) = '33333333-3333-4333-8333-333333333333/cv.pdf', 'candidate can point resume_path at their own folder');
select pg_temp.expect_error($$update public.profiles set resume_path = '11111111-1111-4111-8111-111111111111/cv.pdf'$$, '23514', 'candidate cannot point resume_path at another user''s folder');
select pg_temp.expect_error($$update public.profiles set experience = '{"not":"an array"}'::jsonb$$, '23514', 'experience must be a JSON array');
select pg_temp.reset();

-- candidate: apply -----------------------------------------------------
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
insert into public.applications (job_id, cover_note) select id, 'Hello' from public.jobs where slug = 'frontend-developer-intern-brightwell';
select pg_temp.check_that((select count(*) from public.applications) = 1, 'candidate can apply to an open job');
select pg_temp.check_that((select count(*) from public.application_events where status = 'applied') = 1, 'applying writes the first timeline event');
select pg_temp.check_that((select status from public.applications) = 'applied', 'new application starts as applied');
select pg_temp.expect_error($$insert into public.applications (job_id) select id from public.jobs where slug = 'frontend-developer-intern-brightwell'$$, '23505', 'duplicate application is rejected (409 in the API)');
select pg_temp.expect_error($$insert into public.applications (job_id) select id from public.jobs where slug = 'catalogue-operations-executive'$$, '42501', 'cannot apply to a closed job');
select pg_temp.expect_error($$insert into public.applications (job_id, cover_note) select id, repeat('x', 3001) from public.jobs where slug = 'fraud-analyst'$$, '23514', 'cover note over 3000 characters is rejected');
select pg_temp.expect_error($$insert into public.applications (candidate_id, job_id) select '11111111-1111-4111-8111-111111111111', id from public.jobs where slug = 'fraud-analyst'$$, '42501', 'cannot apply on behalf of someone else');
select pg_temp.reset();

-- undo: only the owner, only while still 'applied' and recent
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
insert into public.applications (job_id) select id from public.jobs where slug = 'fraud-analyst';
select pg_temp.check_that((select count(*) from public.applications) = 2, 'second application created');
select pg_temp.reset();
-- the id of the other candidate's application, captured while we can still see it (RLS hides it from the demo candidate)
create temp table t_other_app as select id from public.applications where candidate_id = '33333333-3333-4333-8333-333333333333' order by created_at desc limit 1;
grant select on t_other_app to authenticated;
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select pg_temp.expect_error($$select public.undo_application((select id from t_other_app))$$, 'P0002', 'another candidate cannot undo my application');
select pg_temp.expect_error($$select public.undo_application(a.id) from public.applications a join public.jobs j on j.id = a.job_id where j.slug = 'backend-engineer-lending'$$, '22023', 'a shortlisted application cannot be undone');
select pg_temp.reset();
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select public.undo_application(a.id) from public.applications a join public.jobs j on j.id = a.job_id where j.slug = 'fraud-analyst';
select pg_temp.check_that((select count(*) from public.applications) = 1, 'undo removes a fresh application');
select pg_temp.check_that((select count(*) from public.application_events) = 1, 'and its timeline events go with it');
select pg_temp.expect_error($$delete from public.applications$$, '42501', 'candidates still cannot delete applications directly');
select pg_temp.reset();

-- profile versioning ----------------------------------------------------
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select pg_temp.check_that((select profile_version from public.profiles) = 1, 'profile starts at version 1');
update public.profiles set phone = '+91 90000 00000';
select pg_temp.check_that((select profile_version from public.profiles) = 1, 'phone change does not bump the AI cache version');
update public.profiles set skills = array['SQL', 'Python'];
select pg_temp.check_that((select profile_version from public.profiles) = 2, 'skills change bumps profile_version');
select pg_temp.reset();

-- admin: status changes -------------------------------------------------
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select pg_temp.check_that((select count(*) from public.applications) = 7, 'admin sees all applications');
select pg_temp.check_that((select (public.admin_set_application_status(a.id, 'under_review', 'Reviewing')).status from public.applications a join public.jobs j on j.id = a.job_id where j.slug = 'frontend-developer-intern-brightwell') = 'under_review', 'admin moves applied to under_review');
select pg_temp.check_that((select count(*) from public.application_events e join public.applications a on a.id = e.application_id join public.jobs j on j.id = a.job_id where j.slug = 'frontend-developer-intern-brightwell' and e.status = 'under_review' and e.actor_id = '22222222-2222-4222-8222-222222222222' and e.note = 'Reviewing') = 1, 'the status change wrote an event with actor and note');
select pg_temp.expect_error($$select public.admin_set_application_status(a.id, 'offered') from public.applications a join public.jobs j on j.id = a.job_id where j.slug = 'frontend-developer-intern-brightwell'$$, '22023', 'cannot skip stages (under_review to offered)');
select pg_temp.expect_error($$select public.admin_set_application_status(a.id, 'interview') from public.applications a join public.jobs j on j.id = a.job_id where j.slug = 'staff-software-engineer'$$, '22023', 'rejected is terminal');
select pg_temp.expect_error($$select public.admin_set_application_status('00000000-0000-0000-0000-000000000000', 'under_review')$$, 'P0002', 'unknown application id');
select pg_temp.reset();

-- the candidate sees the new event, nobody else does ---------------------
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select pg_temp.check_that((select count(*) from public.application_events) = 2, 'candidate sees both events on their application');
select pg_temp.reset();

select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select pg_temp.check_that((select count(*) from public.applications where candidate_id <> '11111111-1111-4111-8111-111111111111') = 0, 'demo candidate cannot see the other candidate''s application');
select pg_temp.reset();

-- contacts: signed-in candidates can read them but never change them ------
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select pg_temp.check_that((select count(*) from public.company_contacts) = 34, 'candidate sees a founder and a recruiter for each of 17 companies');
select pg_temp.check_that((select applications from public.company_response('tamarind-health')) >= 1, 'candidate gets reply-time aggregates');
select pg_temp.expect_error($$update public.company_contacts set email = 'x@y.z'$$, '42501', 'candidate cannot edit contacts');
select pg_temp.reset();

-- roadmap: private to its owner ---------------------------------------
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
insert into public.roadmap_items (target, week, skill, task, resource_title, resource_url) values ('Test role', 1, 'SQL', 'Do the thing', 'Guide', 'https://example.com/guide');
select pg_temp.check_that((select count(*) from public.roadmap_items) = 1, 'owner sees their own roadmap item');
update public.roadmap_items set done = true;
select pg_temp.check_that((select done from public.roadmap_items) = true, 'owner can tick a task');
select pg_temp.expect_error($$update public.roadmap_items set task = 'changed'$$, '42501', 'only done is updatable, not the task text');
select pg_temp.expect_error($$insert into public.roadmap_items (target, week, skill, task, resource_title, resource_url) values ('x', 1, 'x', 'x', 'x', 'http://not-https')$$, '23514', 'links must be https');
select pg_temp.reset();
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select pg_temp.check_that((select count(*) from public.roadmap_items) = 0, 'another candidate cannot see it');
select pg_temp.reset();
select pg_temp.act_as(null, 'anon');
select pg_temp.expect_error('select * from public.roadmap_items', '42501', 'anon cannot read roadmaps');
select pg_temp.reset();

rollback;
\echo ALL SECURITY CHECKS PASSED
