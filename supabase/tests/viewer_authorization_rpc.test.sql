-- Verify the service-only public viewer authorization boundary against real
-- workspace, repository, installation, share, and session rows.

begin;

select no_plan();

select tests.create_supabase_user('viewer-rpc-a@example.com');
select tests.create_supabase_user('viewer-rpc-b@example.com');
select tests.authenticate_as_service_role();

create temporary table viewer_rpc_fixture (
  user_a uuid not null,
  workspace_a uuid not null,
  installation_a uuid not null,
  repository_a uuid not null,
  share_a uuid not null,
  session_a uuid not null,
  share_other uuid not null,
  session_other uuid not null,
  workspace_b uuid not null,
  installation_b uuid not null,
  repository_b uuid not null,
  share_b uuid not null
) on commit drop;

insert into viewer_rpc_fixture
select user_a.id,
       workspace_a.id,
       '10000000-0000-4000-8000-000000000001'::uuid,
       '20000000-0000-4000-8000-000000000001'::uuid,
       '30000000-0000-4000-8000-000000000001'::uuid,
       '40000000-0000-4000-8000-000000000001'::uuid,
       '30000000-0000-4000-8000-000000000002'::uuid,
       '40000000-0000-4000-8000-000000000002'::uuid,
       workspace_b.id,
       '10000000-0000-4000-8000-000000000002'::uuid,
       '20000000-0000-4000-8000-000000000002'::uuid,
       '30000000-0000-4000-8000-000000000003'::uuid
from auth.users as user_a
join public.workspaces as workspace_a on workspace_a.owner_id = user_a.id and workspace_a.is_personal
cross join auth.users as user_b
join public.workspaces as workspace_b on workspace_b.owner_id = user_b.id and workspace_b.is_personal
where user_a.email = 'viewer-rpc-a@example.com'
  and user_b.email = 'viewer-rpc-b@example.com';

insert into public.github_installations (
  id, workspace_id, github_installation_id, github_account_id,
  github_account_login, github_account_type, repository_selection, status
)
select installation_a, workspace_a, 992001, 992011, 'viewer-rpc-a', 'Organization', 'selected', 'active'
from viewer_rpc_fixture
union all
select installation_b, workspace_b, 992002, 992012, 'viewer-rpc-b', 'Organization', 'selected', 'active'
from viewer_rpc_fixture;

insert into public.repositories (
  id, workspace_id, github_installation_id, github_repository_id,
  github_node_id, github_owner, github_repo, default_branch, enabled
)
select repository_a, workspace_a, installation_a, 992021, 'R_viewer_rpc_a', 'viewer-rpc-a', 'repo-a', 'main', true
from viewer_rpc_fixture
union all
select repository_b, workspace_b, installation_b, 992022, 'R_viewer_rpc_b', 'viewer-rpc-b', 'repo-b', 'main', true
from viewer_rpc_fixture;

insert into public.shares (
  id, workspace_id, repository_id, share_code, token_hash, recipient_label, ref, created_by
)
select share_a, workspace_a, repository_a, 'ViewRpcA1', 'viewer-rpc-capability-a', 'A', 'refs/heads/main', user_a
from viewer_rpc_fixture
union all
select share_other, workspace_a, repository_a, 'ViewRpcA2', 'viewer-rpc-capability-other', 'A other', 'refs/heads/main', user_a
from viewer_rpc_fixture
union all
select share_b, workspace_b, repository_b, 'ViewRpcB1', 'viewer-rpc-capability-b', 'B', 'refs/heads/main', (select owner_id from public.workspaces where id = workspace_b)
from viewer_rpc_fixture;

insert into public.viewer_sessions (id, workspace_id, share_id, session_token_hash)
select session_a, workspace_a, share_a, 'viewer-rpc-session-a'
from viewer_rpc_fixture
union all
select session_other, workspace_a, share_other, 'viewer-rpc-session-other'
from viewer_rpc_fixture;

select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'authorized'::text,
  'valid capability is resolved'
);
select is(
  (select count(*) from public.authorize_viewer_session('viewer-rpc-session-a', share_a, null) where authorization_status = 'authorized'),
  1::bigint,
  'valid viewer session is authorized'
) from viewer_rpc_fixture;
select is(
  (select count(*) from public.authorize_viewer_session('viewer-rpc-session-a', share_other, null)),
  0::bigint,
  'session cannot cross shares'
) from viewer_rpc_fixture;
select is(
  (select count(*) from public.authorize_viewer_session('viewer-rpc-session-a', share_b, null)),
  0::bigint,
  'session cannot cross workspaces'
) from viewer_rpc_fixture;
select is(
  (select count(*) from public.authorize_viewer_session('viewer-rpc-session-a', null, 'ViewRpcA1')),
  1::bigint,
  'share code resolves without UUID casting'
) from viewer_rpc_fixture;

update public.shares set revoked_at = now() where id = (select share_a from viewer_rpc_fixture);
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'revoked'::text,
  'revoked capability is denied'
);
select is(
  (select authorization_status from public.authorize_viewer_session('viewer-rpc-session-a', (select share_a from viewer_rpc_fixture), null)),
  'revoked'::text,
  'revoked viewer session is denied'
);

update public.shares set revoked_at = null, expires_at = now() - interval '1 minute' where id = (select share_a from viewer_rpc_fixture);
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'expired'::text,
  'expired capability is denied'
);
select is(
  (select authorization_status from public.authorize_viewer_session('viewer-rpc-session-a', (select share_a from viewer_rpc_fixture), null)),
  'expired'::text,
  'expired viewer session is denied'
);

update public.shares set expires_at = null where id = (select share_a from viewer_rpc_fixture);
update public.workspaces set status = 'deleting' where id = (select workspace_a from viewer_rpc_fixture);
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'repository_unavailable'::text,
  'inactive workspace is denied'
);
select is(
  (select authorization_status from public.authorize_viewer_session('viewer-rpc-session-a', (select share_a from viewer_rpc_fixture), null)),
  'repository_unavailable'::text,
  'inactive workspace viewer session is denied'
);
update public.workspaces set status = 'active' where id = (select workspace_a from viewer_rpc_fixture);

update public.repositories set enabled = false where id = (select repository_a from viewer_rpc_fixture);
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'repository_unavailable'::text,
  'disabled repository is denied'
);
select is(
  (select authorization_status from public.authorize_viewer_session('viewer-rpc-session-a', (select share_a from viewer_rpc_fixture), null)),
  'repository_unavailable'::text,
  'disabled repository viewer session is denied'
);
update public.repositories set enabled = true where id = (select repository_a from viewer_rpc_fixture);

update public.github_installations set status = 'suspended' where id = (select installation_a from viewer_rpc_fixture);
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'repository_unavailable'::text,
  'inactive installation is denied'
);
select is(
  (select authorization_status from public.authorize_viewer_session('viewer-rpc-session-a', (select share_a from viewer_rpc_fixture), null)),
  'repository_unavailable'::text,
  'inactive installation viewer session is denied'
);
update public.github_installations set status = 'active' where id = (select installation_a from viewer_rpc_fixture);

select ok(not has_function_privilege('anon', 'public.resolve_share_capability(text)', 'EXECUTE'), 'anon cannot execute viewer authorization RPCs');
select ok(not has_function_privilege('anon', 'public.authorize_viewer_session(text,uuid,text)', 'EXECUTE'), 'anon cannot execute session authorization RPC');
select ok(not has_function_privilege('authenticated', 'public.resolve_share_capability(text)', 'EXECUTE'), 'authenticated cannot execute capability resolution RPC');
select ok(not has_function_privilege('authenticated', 'public.authorize_viewer_session(text,uuid,text)', 'EXECUTE'), 'authenticated cannot execute viewer authorization RPCs');
select ok(has_function_privilege('service_role', 'public.resolve_share_capability(text)', 'EXECUTE'), 'service_role can execute viewer authorization RPCs');
select ok(has_function_privilege('service_role', 'public.authorize_viewer_session(text,uuid,text)', 'EXECUTE'), 'service_role can execute session authorization RPC');

select tests.authenticate_as_service_role();
select is(
  (select authorization_status from public.resolve_share_capability('viewer-rpc-capability-a')),
  'authorized'::text,
  'service_role can execute viewer authorization RPCs'
);

select * from finish();
rollback;
