-- Direct Supabase database tests. Run with `npx supabase test db`.
-- This verifies the fail-closed request transaction and replay-safe job
-- creation. Batch worker failure/retry behavior is covered by the server-side
-- worker tests because Auth deletion failures cannot be injected through SQL.

begin;

select no_plan();

select tests.create_supabase_user('account-deletion-job@example.com');
select tests.authenticate_as_service_role();

create temporary table deletion_fixture (
  user_id uuid not null,
  workspace_id uuid not null,
  installation_id uuid not null,
  repository_id uuid not null,
  share_id uuid not null,
  job_id uuid
) on commit drop;

insert into deletion_fixture (user_id, workspace_id, installation_id, repository_id, share_id)
select users.id, workspaces.id, gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
from auth.users as users
join public.workspaces as workspaces on workspaces.owner_id = users.id and workspaces.is_personal
where users.email = 'account-deletion-job@example.com';

insert into public.github_installations (
  id, workspace_id, github_installation_id, github_account_id,
  github_account_login, github_account_type, repository_selection, status
)
select installation_id, workspace_id, 981001, 981002, 'deletion-test-org', 'Organization', 'selected', 'active'
from deletion_fixture;

insert into public.repositories (
  id, workspace_id, github_installation_id, github_repository_id,
  github_node_id, github_owner, github_repo, default_branch, enabled
)
select repository_id, workspace_id, installation_id, 981003, 'R_deletion_test', 'deletion-test-org', 'private-repo', 'main', true
from deletion_fixture;

insert into public.shares (
  id, workspace_id, repository_id, token_hash, recipient_label, ref, created_by
)
select share_id, workspace_id, repository_id, 'deletion-job-share-token', 'Deletion test', 'main', user_id
from deletion_fixture;

update public.notification_settings
set destination_email = 'account-deletion-job@example.com',
    email_verified = true,
    view_opened = true,
    digest_frequency = 'daily'
where workspace_id = (select workspace_id from deletion_fixture);

update deletion_fixture
set job_id = (public.request_account_deletion(deletion_fixture.user_id)).id
where job_id is null;

select is((select count(*) from public.account_deletion_jobs where user_id = (select user_id from deletion_fixture)), 1::bigint, 'deletion request creates one durable job');
select is((select count(*) from public.account_lifecycle_audit where deletion_job_id = (select job_id from deletion_fixture)), 1::bigint, 'deletion request creates one minimal system lifecycle record');
select is((select status from public.account_lifecycle_audit where deletion_job_id = (select job_id from deletion_fixture)), 'requested', 'lifecycle audit starts without tenant data');
select is((select status from public.workspaces where id = (select workspace_id from deletion_fixture)), 'deleting', 'deletion request immediately fails closed at workspace level');
select isnt((select revoked_at from public.shares where id = (select share_id from deletion_fixture)), null::timestamptz, 'deletion request revokes active shares');
select is((select enabled from public.repositories where id = (select repository_id from deletion_fixture)), false, 'deletion request disables repositories');
select is((select status from public.github_installations where id = (select installation_id from deletion_fixture)), 'deleted', 'deletion request disables GitHub installations');
select is((select view_opened from public.notification_settings where workspace_id = (select workspace_id from deletion_fixture)), false, 'deletion request disables notifications');
select is((select digest_frequency from public.notification_settings where workspace_id = (select workspace_id from deletion_fixture)), 'off', 'deletion request disables notification digests');

select is((public.request_account_deletion((select user_id from deletion_fixture))).id, (select job_id from deletion_fixture), 'repeated deletion request returns the same job');
select is((select count(*) from public.account_deletion_jobs where user_id = (select user_id from deletion_fixture)), 1::bigint, 'repeated deletion request does not create a duplicate job');

select * from finish();
rollback;
