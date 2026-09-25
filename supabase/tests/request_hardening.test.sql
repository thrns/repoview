-- Direct Supabase database tests. Run with `npx supabase test db`.
-- The application tests simulate concurrent callers; this file verifies the
-- database uniqueness and reservation boundaries they rely on.

begin;

select no_plan();

select tests.create_supabase_user('request-hardening@example.com');
select tests.authenticate_as_service_role();

create temporary table request_hardening_fixture (
  user_id uuid not null,
  workspace_id uuid not null,
  installation_id uuid not null,
  repository_id uuid not null,
  share_id uuid not null,
  session_id uuid not null
) on commit drop;

insert into request_hardening_fixture
select users.id, workspaces.id,
  '10000000-0000-4000-8000-000000000001'::uuid,
  '20000000-0000-4000-8000-000000000001'::uuid,
  '30000000-0000-4000-8000-000000000001'::uuid,
  '40000000-0000-4000-8000-000000000001'::uuid
from auth.users as users
join public.workspaces as workspaces on workspaces.owner_id = users.id and workspaces.is_personal
where users.email = 'request-hardening@example.com';

create temporary table first_reservation as
select * from public.reserve_workspace_resource_quota(
  'active-shares',
  (select workspace_id from request_hardening_fixture),
  'share:request-hardening-resource',
  1000,
  now() + interval '5 minutes'
);

select is((select count(*) from first_reservation where allowed), 1::bigint, 'first resource reservation is allowed');
select is((select count(*) from first_reservation where not already_reserved), 1::bigint, 'first resource reservation owns its slot');

create temporary table repeated_reservation as
select * from public.reserve_workspace_resource_quota(
  'active-shares',
  (select workspace_id from request_hardening_fixture),
  'share:request-hardening-resource',
  1000,
  now() + interval '5 minutes'
);

select is((select count(*) from repeated_reservation where allowed and already_reserved), 1::bigint, 'repeated resource reservation is idempotent');
select is((select count(*) from public.quota_resource_reservations where resource_key = 'share:request-hardening-resource'), 1::bigint, 'repeated reservation does not allocate a second slot');
select public.finalize_workspace_resource_quota((select reservation_id from first_reservation));

insert into public.github_installations (
  id, workspace_id, github_installation_id, github_account_id,
  github_account_login, github_account_type, repository_selection, status
)
select installation_id, workspace_id, 991001, 991002, 'request-hardening', 'Organization', 'selected', 'active'
from request_hardening_fixture;

insert into public.repositories (
  id, workspace_id, github_installation_id, github_repository_id,
  github_node_id, github_owner, github_repo, default_branch, enabled
)
select repository_id, workspace_id, installation_id, 991003,
  'R_request_hardening', 'request-hardening', 'private-repo', 'main', true
from request_hardening_fixture;

insert into public.shares (
  id, workspace_id, repository_id, share_code, token_hash, recipient_label, ref, created_by
)
select share_id, workspace_id, repository_id, 'reqhard1', 'request-hardening-share-token', 'Request hardening', 'main', user_id
from request_hardening_fixture;

insert into public.viewer_sessions (
  id, workspace_id, share_id, session_token_hash, confirmed_at
)
select session_id, workspace_id, share_id, 'request-hardening-session-token', now()
from request_hardening_fixture;

insert into public.view_events (
  event_id, workspace_id, share_id, session_id, event_type, path
)
select '00000000-0000-4000-8000-000000000001'::uuid, workspace_id, share_id, session_id, 'file_viewed', 'README.md'
from request_hardening_fixture;

select throws_ok(
  $$insert into public.view_events (event_id, workspace_id, share_id, session_id, event_type, path)
    select '00000000-0000-4000-8000-000000000001'::uuid, workspace_id, share_id, session_id, 'file_viewed', 'README.md'
    from request_hardening_fixture$$,
  '23505',
  null,
  'replayed analytics event identity is rejected by the database'
);

select is(
  (select count(*) from public.view_events where event_id = '00000000-0000-4000-8000-000000000001'::uuid),
  1::bigint,
  'replayed analytics event does not create duplicate storage'
);

select * from finish();
rollback;
