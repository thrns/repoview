-- Direct Supabase database tests. Run with `npx supabase test db`.
-- This verifies the launch gate against the same database objects it checks.

begin;

select no_plan();

select tests.create_supabase_user('prelaunch-check@example.com');
select tests.authenticate_as_service_role();

select is(
  (select count(*) from public.prelaunch_check() where not passed),
  0::bigint,
  'a clean database passes every prelaunch invariant'
);

select is(
  (select count(*) from public.prelaunch_check() where check_name = 'database_migrations' and passed),
  1::bigint,
  'required database migration schema is present'
);

select is(
  (select count(*) from public.prelaunch_check() where check_name = 'repository_identity_migration' and passed),
  1::bigint,
  'repository identity migration check is present and passes'
);

select is(
  (select count(*) from public.prelaunch_check() where check_name = 'github_installation_migration' and passed),
  1::bigint,
  'GitHub installation migration check is present and passes'
);

select is(
  (select count(*) from public.prelaunch_check() where check_name = 'personal_workspace_per_profile' and passed),
  1::bigint,
  'personal workspace provisioning check passes for a new Auth user'
);

select is(
  (select count(*) from public.prelaunch_check() where check_name = 'workspace_notification_settings' and passed),
  1::bigint,
  'workspace notification settings check passes for a new workspace'
);

select * from finish();
rollback;
