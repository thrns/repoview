-- Direct Supabase database tests. Run with `supabase test db`.
-- The Supabase test helpers create users and set auth.uid() for each session.

begin;

select no_plan();

select tests.create_supabase_user('rls-user-a@example.com');
select tests.create_supabase_user('rls-user-b@example.com');
select tests.authenticate_as_service_role();

create temporary table rls_fixture (
  user_a uuid not null,
  user_b uuid not null,
  workspace_a uuid not null,
  workspace_b uuid not null,
  workspace_c uuid not null,
  repository_b uuid not null,
  share_b uuid not null,
  viewer_b uuid not null,
  session_b uuid not null,
  event_b bigint not null,
  repository_event_b bigint not null,
  engagement_b uuid not null,
  installation_b uuid not null,
  delivery_b uuid not null,
  access_attempt_b uuid not null,
  audit_b bigint not null
) on commit drop;

insert into public.workspaces (id, name, slug, owner_id)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'RLS Workspace Without Settings',
  'rls-workspace-c',
  tests.get_supabase_uid('rls-user-b@example.com')
);

insert into rls_fixture
select
  tests.get_supabase_uid('rls-user-a@example.com'),
  tests.get_supabase_uid('rls-user-b@example.com'),
  workspace_a.id,
  workspace_b.id,
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe'::uuid,
  910001,
  910002,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbf'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'::uuid,
  910003
from public.workspaces as workspace_a
join public.workspaces as workspace_b
  on workspace_b.owner_id = tests.get_supabase_uid('rls-user-b@example.com')
where workspace_a.owner_id = tests.get_supabase_uid('rls-user-a@example.com');

insert into public.github_installations (
  id,
  workspace_id,
  github_installation_id,
  github_account_id,
  github_account_login,
  github_account_type,
  repository_selection,
  permissions,
  status
)
select installation_b, workspace_b, 910004, 920004, 'foreign-org', 'Organization', 'selected', '{"contents":"read"}'::jsonb, 'active'
from rls_fixture;

insert into public.repositories (id, workspace_id, github_installation_id, github_owner, github_repo, default_branch)
select repository_b, workspace_b, installation_b, 'rls', 'foreign-repository', 'main'
from rls_fixture;

insert into public.shares (id, workspace_id, repository_id, token_hash, ref, created_by)
select share_b, workspace_b, repository_b, 'rls-foreign-share-token', 'main', user_b
from rls_fixture;

insert into public.share_recipients (workspace_id, share_id, recipient_name, company)
select workspace_b, share_b, 'Foreign Recipient', 'Foreign Company'
from rls_fixture;

insert into public.viewers (id, workspace_id, viewer_code, viewer_token_hash)
select viewer_b, workspace_b, 'B999', 'rls-foreign-viewer-token'
from rls_fixture;

insert into public.viewer_sessions (id, workspace_id, share_id, viewer_id, session_token_hash)
select session_b, workspace_b, share_b, viewer_b, 'rls-foreign-session-token'
from rls_fixture;

insert into public.view_events (id, workspace_id, share_id, session_id, event_type, path)
select event_b, workspace_b, share_b, session_b, 'file_viewed', 'src/foreign.ts'
from rls_fixture;

insert into public.repository_events (id, workspace_id, share_id, session_id, viewer_id, event_type, path, occurred_at)
select repository_event_b, workspace_b, share_b, session_b, viewer_b, 'file_viewed', 'src/foreign.ts', now()
from rls_fixture;

insert into public.file_engagement (id, workspace_id, share_id, session_id, viewer_id, path)
select engagement_b, workspace_b, share_b, session_b, viewer_b, 'src/foreign.ts'
from rls_fixture;

insert into public.notification_deliveries (id, workspace_id, share_id, session_id, status)
select delivery_b, workspace_b, share_b, session_b, 'sent'
from rls_fixture;

insert into public.share_access_attempts (id, workspace_id, share_id, token_hash, valid)
select access_attempt_b, workspace_b, share_b, 'rls-foreign-attempt-token', true
from rls_fixture;

insert into public.audit_logs (id, workspace_id, actor_id, action, resource_type, resource_id)
select audit_b, workspace_b, user_b, 'created', 'repository', repository_b::text
from rls_fixture;

select tests.authenticate_as('rls-user-a@example.com');

-- Cross-tenant SELECTs return no rows, including the workspace graph itself.
select is((select count(*) from public.workspaces where id = workspace_b), 0::bigint, 'User A cannot select User B workspace') from rls_fixture;
select is((select count(*) from public.workspace_members where workspace_id = workspace_b), 0::bigint, 'User A cannot select User B memberships') from rls_fixture;
select is((select count(*) from public.github_installations where workspace_id = workspace_b), 0::bigint, 'User A cannot select User B GitHub installations') from rls_fixture;
select is((select count(*) from public.repositories where id = repository_b), 0::bigint, 'User A cannot select User B repositories') from rls_fixture;
select is((select count(*) from public.shares where id = share_b), 0::bigint, 'User A cannot select User B shares') from rls_fixture;
select is((select count(*) from public.share_recipients where share_id = share_b), 0::bigint, 'User A cannot select User B recipients') from rls_fixture;
select is((select count(*) from public.viewer_sessions where id = session_b), 0::bigint, 'User A cannot select User B viewer sessions') from rls_fixture;
select is((select count(*) from public.view_events where id = event_b), 0::bigint, 'User A cannot select User B view events') from rls_fixture;
select is((select count(*) from public.notification_deliveries where id = delivery_b), 0::bigint, 'User A cannot select User B notification deliveries') from rls_fixture;
select is((select count(*) from public.viewers where id = viewer_b), 0::bigint, 'User A cannot select User B viewers') from rls_fixture;
select is((select count(*) from public.repository_events where id = repository_event_b), 0::bigint, 'User A cannot select User B repository events') from rls_fixture;
select is((select count(*) from public.file_engagement where id = engagement_b), 0::bigint, 'User A cannot select User B file engagement') from rls_fixture;
select is((select count(*) from public.share_access_attempts where id = access_attempt_b), 0::bigint, 'User A cannot select User B share access attempts') from rls_fixture;
select is((select count(*) from public.notification_settings where workspace_id = workspace_b), 0::bigint, 'User A cannot select User B notification settings') from rls_fixture;
select is((select count(*) from public.audit_logs where id = audit_b), 0::bigint, 'User A cannot select User B audit logs') from rls_fixture;

-- Cross-tenant INSERTs are rejected by WITH CHECK (or by the absence of a
-- client-write policy for system-owned analytics/audit tables).
select throws_ok($$insert into public.workspaces (name, slug, owner_id) values ('forbidden', 'rls-forbidden', auth.uid())$$, '42501', null, 'User A cannot insert a workspace through the client');
select throws_ok($$insert into public.workspace_members (workspace_id, user_id, role) select workspace_b, auth.uid(), 'member' from rls_fixture$$, '42501', null, 'User A cannot add a member to User B workspace');
select throws_ok($$insert into public.github_installations (workspace_id, github_installation_id, github_account_id, github_account_login, github_account_type, repository_selection) select workspace_b, 910005, 920005, 'forbidden-org', 'Organization', 'selected' from rls_fixture$$, '42501', null, 'User A cannot insert User B GitHub installation');
select throws_ok($$insert into public.repositories (workspace_id, github_installation_id, github_owner, github_repo, default_branch) select workspace_b, installation_b, 'rls', 'forbidden', 'main' from rls_fixture$$, '42501', null, 'User A cannot insert User B repository');
select throws_ok($$insert into public.shares (workspace_id, repository_id, token_hash, ref, created_by) select workspace_b, repository_b, 'rls-forbidden-share-token', 'main', auth.uid() from rls_fixture$$, '42501', null, 'User A cannot insert User B share');
select throws_ok($$insert into public.share_recipients (workspace_id, share_id, recipient_name) select workspace_b, share_b, 'forbidden' from rls_fixture$$, '42501', null, 'User A cannot insert User B recipient');
select throws_ok($$insert into public.viewer_sessions (workspace_id, share_id, session_token_hash) select workspace_b, share_b, 'rls-forbidden-session' from rls_fixture$$, '42501', null, 'User A cannot insert User B viewer session');
select throws_ok($$insert into public.view_events (workspace_id, share_id, session_id, event_type) select workspace_b, share_b, session_b, 'forbidden' from rls_fixture$$, '42501', null, 'User A cannot insert User B view event');
select throws_ok($$insert into public.notification_deliveries (workspace_id, share_id, session_id, status) select workspace_b, share_b, session_b, 'forbidden' from rls_fixture$$, '42501', null, 'User A cannot insert User B notification delivery');
select throws_ok($$insert into public.viewers (workspace_id, viewer_code, viewer_token_hash) select workspace_b, 'A998', 'rls-forbidden-viewer' from rls_fixture$$, '42501', null, 'User A cannot insert User B viewer');
select throws_ok($$insert into public.repository_events (id, workspace_id, share_id, session_id, event_type, occurred_at) select 910006, workspace_b, share_b, session_b, 'forbidden', now() from rls_fixture$$, '42501', null, 'User A cannot insert User B repository event');
select throws_ok($$insert into public.file_engagement (workspace_id, share_id, session_id, path) select workspace_b, share_b, session_b, 'forbidden.ts' from rls_fixture$$, '42501', null, 'User A cannot insert User B file engagement');
select throws_ok($$insert into public.share_access_attempts (workspace_id, share_id, token_hash, valid) select workspace_b, share_b, 'rls-forbidden-attempt', true from rls_fixture$$, '42501', null, 'User A cannot insert User B share access attempt');
select throws_ok($$insert into public.notification_settings (workspace_id) select workspace_c from rls_fixture$$, '42501', null, 'User A cannot insert User B notification settings');
select throws_ok($$insert into public.audit_logs (workspace_id, action, resource_type) select workspace_b, 'forbidden', 'repository' from rls_fixture$$, '42501', null, 'User A cannot insert User B audit log');

-- UPDATE and DELETE see no foreign rows. lives_ok proves the operation does
-- not become an error-based data leak; the service-role assertions below prove
-- the target rows were not modified or removed.
select lives_ok($$update public.workspaces set name = 'tampered' where id = (select workspace_b from rls_fixture)$$, 'User A cannot update User B workspace');
select lives_ok($$update public.workspace_members set role = 'admin' where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot update User B memberships');
select lives_ok($$update public.github_installations set status = 'suspended' where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot update User B GitHub installations');
select lives_ok($$update public.repositories set enabled = false where id = (select repository_b from rls_fixture)$$, 'User A cannot update User B repository');
select lives_ok($$update public.shares set note = 'tampered' where id = (select share_b from rls_fixture)$$, 'User A cannot update User B share');
select lives_ok($$update public.share_recipients set company = 'tampered' where share_id = (select share_b from rls_fixture)$$, 'User A cannot update User B recipient');
select lives_ok($$update public.viewer_sessions set ended_at = now() where id = (select session_b from rls_fixture)$$, 'User A cannot update User B viewer session');
select lives_ok($$update public.view_events set metadata = '{"tampered":true}' where id = (select event_b from rls_fixture)$$, 'User A cannot update User B view event');
select lives_ok($$update public.notification_deliveries set status = 'tampered' where id = (select delivery_b from rls_fixture)$$, 'User A cannot update User B notification delivery');
select lives_ok($$update public.viewers set viewer_code = 'A997' where id = (select viewer_b from rls_fixture)$$, 'User A cannot update User B viewer');
select lives_ok($$update public.repository_events set metadata = '{"tampered":true}' where id = (select repository_event_b from rls_fixture)$$, 'User A cannot update User B repository event');
select lives_ok($$update public.file_engagement set view_count = 99 where id = (select engagement_b from rls_fixture)$$, 'User A cannot update User B file engagement');
select lives_ok($$update public.share_access_attempts set failure_reason = 'tampered' where id = (select access_attempt_b from rls_fixture)$$, 'User A cannot update User B share access attempt');
select lives_ok($$update public.notification_settings set notify_on_view = false where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot update User B notification settings');
select lives_ok($$update public.audit_logs set metadata = '{"tampered":true}' where id = (select audit_b from rls_fixture)$$, 'User A cannot update User B audit log');

select lives_ok($$delete from public.workspaces where id = (select workspace_b from rls_fixture)$$, 'User A cannot delete User B workspace');
select lives_ok($$delete from public.workspace_members where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot delete User B memberships');
select lives_ok($$delete from public.github_installations where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot delete User B GitHub installations');
select lives_ok($$delete from public.repositories where id = (select repository_b from rls_fixture)$$, 'User A cannot delete User B repository');
select lives_ok($$delete from public.shares where id = (select share_b from rls_fixture)$$, 'User A cannot delete User B share');
select lives_ok($$delete from public.share_recipients where share_id = (select share_b from rls_fixture)$$, 'User A cannot delete User B recipient');
select lives_ok($$delete from public.viewer_sessions where id = (select session_b from rls_fixture)$$, 'User A cannot delete User B viewer session');
select lives_ok($$delete from public.view_events where id = (select event_b from rls_fixture)$$, 'User A cannot delete User B view event');
select lives_ok($$delete from public.notification_deliveries where id = (select delivery_b from rls_fixture)$$, 'User A cannot delete User B notification delivery');
select lives_ok($$delete from public.viewers where id = (select viewer_b from rls_fixture)$$, 'User A cannot delete User B viewer');
select lives_ok($$delete from public.repository_events where id = (select repository_event_b from rls_fixture)$$, 'User A cannot delete User B repository event');
select lives_ok($$delete from public.file_engagement where id = (select engagement_b from rls_fixture)$$, 'User A cannot delete User B file engagement');
select lives_ok($$delete from public.share_access_attempts where id = (select access_attempt_b from rls_fixture)$$, 'User A cannot delete User B share access attempt');
select lives_ok($$delete from public.notification_settings where workspace_id = (select workspace_b from rls_fixture)$$, 'User A cannot delete User B notification settings');
select lives_ok($$delete from public.audit_logs where id = (select audit_b from rls_fixture)$$, 'User A cannot delete User B audit log');

select tests.authenticate_as_service_role();

select is((select enabled from public.repositories where id = repository_b), true, 'foreign repository remains unchanged') from rls_fixture;
select is((select note from public.shares where id = share_b), null::text, 'foreign share remains unchanged') from rls_fixture;
select is((select company from public.share_recipients where share_id = share_b), 'Foreign Company', 'foreign recipient remains unchanged') from rls_fixture;
select is((select ended_at from public.viewer_sessions where id = session_b), null::timestamptz, 'foreign viewer session remains unchanged') from rls_fixture;
select is((select metadata from public.view_events where id = event_b), '{}'::jsonb, 'foreign view event remains unchanged') from rls_fixture;
select is((select status from public.notification_deliveries where id = delivery_b), 'sent', 'foreign notification delivery remains unchanged') from rls_fixture;
select is((select viewer_code from public.viewers where id = viewer_b), 'B999', 'foreign viewer remains unchanged') from rls_fixture;
select is((select metadata from public.repository_events where id = repository_event_b), '{}'::jsonb, 'foreign repository event remains unchanged') from rls_fixture;
select is((select view_count from public.file_engagement where id = engagement_b), 1, 'foreign file engagement remains unchanged') from rls_fixture;
select is((select failure_reason from public.share_access_attempts where id = access_attempt_b), null::text, 'foreign share access attempt remains unchanged') from rls_fixture;
select is((select notify_on_view from public.notification_settings where workspace_id = workspace_b), true, 'foreign notification settings remain unchanged') from rls_fixture;
select is((select count(*) from public.audit_logs where id = audit_b), 1::bigint, 'foreign audit log remains present') from rls_fixture;
select is((select count(*) from public.workspaces where id = workspace_b), 1::bigint, 'foreign workspace remains present') from rls_fixture;

select * from finish();
rollback;
