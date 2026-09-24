-- Direct Supabase database tests. Run with `supabase test db`.
-- These cover the Auth trigger and the profile-completion RPC at the database
-- boundary, including replayed provisioning.

begin;

select no_plan();

select tests.create_supabase_user('onboarding-provisioning@example.com');
select tests.authenticate_as_service_role();

create temporary table onboarding_fixture (
  user_id uuid not null,
  workspace_id uuid not null
) on commit drop;

insert into onboarding_fixture
select
  users.id,
  workspaces.id
from auth.users as users
join public.workspaces as workspaces on workspaces.owner_id = users.id and workspaces.is_personal
where users.email = 'onboarding-provisioning@example.com';

select is((select count(*) from onboarding_fixture), 1::bigint, 'new user receives a provisioned personal workspace');
select is((select count(*) from public.profiles where id = (select user_id from onboarding_fixture)), 1::bigint, 'new user receives exactly one profile');
select is((select count(*) from public.workspaces where owner_id = (select user_id from onboarding_fixture) and is_personal), 1::bigint, 'new user has exactly one personal workspace');
select is((select count(*) from public.workspaces where owner_id = (select user_id from onboarding_fixture)), 1::bigint, 'new user has exactly one provisioned workspace');
select is((select is_personal from public.workspaces where id = (select workspace_id from onboarding_fixture)), true, 'personal workspace is marked personal');
select is((select count(*) from public.workspace_members where workspace_id = (select workspace_id from onboarding_fixture) and user_id = (select user_id from onboarding_fixture) and role = 'owner'), 1::bigint, 'personal workspace has exactly one owner membership');
select is((select count(*) from public.notification_settings where workspace_id = (select workspace_id from onboarding_fixture)), 1::bigint, 'personal workspace has exactly one notification settings row');

-- Invoke the same trigger function a second time with the original Auth row.
-- This models a replayed provisioning event without altering auth.users.
create temporary table onboarding_provisioning_retry (
  id uuid not null,
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb
) on commit drop;

create trigger onboarding_provisioning_retry_trigger
after insert on onboarding_provisioning_retry
for each row execute function public.handle_new_user();

insert into onboarding_provisioning_retry
select users.id, users.email, users.email_confirmed_at, users.raw_user_meta_data
from auth.users as users
where users.email = 'onboarding-provisioning@example.com';

select is((select count(*) from public.workspaces where owner_id = (select user_id from onboarding_fixture) and is_personal), 1::bigint, 'repeated provisioning does not create a duplicate personal workspace');
select is((select count(*) from public.workspaces where owner_id = (select user_id from onboarding_fixture)), 1::bigint, 'repeated provisioning does not create any duplicate workspace');
select is((select count(*) from public.workspace_members where workspace_id = (select workspace_id from onboarding_fixture) and user_id = (select user_id from onboarding_fixture) and role = 'owner'), 1::bigint, 'repeated provisioning keeps exactly one owner membership');
select is((select count(*) from public.notification_settings where workspace_id = (select workspace_id from onboarding_fixture)), 1::bigint, 'repeated provisioning keeps exactly one notification settings row');

select tests.authenticate_as('onboarding-provisioning@example.com');
select lives_ok($$select * from public.complete_profile('Ada Lovelace')$$, 'profile completion succeeds for the authenticated user');

select tests.authenticate_as_service_role();
select is((select terms_version_accepted from public.profiles where id = (select user_id from onboarding_fixture)), '2026-09-23'::text, 'profile completion stores the current Terms version');
select is((select privacy_version_acknowledged from public.profiles where id = (select user_id from onboarding_fixture)), '2026-09-24'::text, 'profile completion stores the current Privacy version');
select is(
  (
    select profile_completed_at is not null
      and terms_version_accepted = current_versions.terms_version
      and privacy_version_acknowledged = current_versions.privacy_version
    from public.profiles
    cross join lateral (select * from public.current_legal_versions()) as current_versions
    where profiles.id = (select user_id from onboarding_fixture)
  ),
  true,
  'completed profile satisfies the current onboarding checkpoint'
);

select * from finish();
rollback;
