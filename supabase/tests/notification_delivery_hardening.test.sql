-- Direct Supabase database tests. Run with `npx supabase test db`.
-- Provider calls are server-side, so these tests exercise the database
-- boundary: pre-send eligibility, proactive cancellation, and lease recovery.

begin;

select no_plan();

select tests.create_supabase_user('notification-delivery@example.com');
select tests.authenticate_as_service_role();

create temporary table notification_fixture (
  user_id uuid not null,
  workspace_id uuid not null,
  installation_id uuid not null,
  repository_id uuid not null,
  share_id uuid not null,
  session_id uuid not null,
  delivery_id uuid,
  unknown_delivery_id uuid
) on commit drop;

insert into notification_fixture (user_id, workspace_id, installation_id, repository_id, share_id, session_id)
select users.id, workspaces.id, gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
from auth.users as users
join public.workspaces as workspaces on workspaces.owner_id = users.id and workspaces.is_personal
where users.email = 'notification-delivery@example.com';

insert into public.github_installations (
  id, workspace_id, github_installation_id, github_account_id,
  github_account_login, github_account_type, repository_selection, status
)
select installation_id, workspace_id, 982001, 982002, 'notification-test-org', 'Organization', 'selected', 'active'
from notification_fixture;

insert into public.repositories (
  id, workspace_id, github_installation_id, github_repository_id,
  github_node_id, github_owner, github_repo, default_branch, enabled
)
select repository_id, workspace_id, installation_id, 982003, 'R_notification_test', 'notification-test-org', 'private-repo', 'main', true
from notification_fixture;

insert into public.shares (
  id, workspace_id, repository_id, token_hash, recipient_label, ref, created_by
)
select share_id, workspace_id, repository_id, 'notification-test-share-token', 'Notification test', 'main', user_id
from notification_fixture;

insert into public.viewer_sessions (
  id, workspace_id, share_id, session_token_hash, confirmed_at, ended_at
)
select session_id, workspace_id, share_id, 'notification-test-session-token', now(), now()
from notification_fixture;

update public.notification_settings
set destination_email = 'notification-delivery@example.com',
    email_verified = true,
    view_opened = true,
    session_summary = true
where workspace_id = (select workspace_id from notification_fixture);

insert into public.notification_deliveries (
  workspace_id, share_id, session_id, channel, recipient,
  notification_kind, status, payload, idempotency_key
)
select workspace_id, share_id, session_id, 'email', 'notification-delivery@example.com',
       'view_opened', 'pending', jsonb_build_object('email', jsonb_build_object(
         'to', 'notification-delivery@example.com', 'subject', 'Test', 'text', 'Test'
       )), 'notification-test-delivery'
from notification_fixture
;

update notification_fixture
set delivery_id = (select id from public.notification_deliveries where idempotency_key = 'notification-test-delivery');

select is((select status from public.claim_notification_delivery((select delivery_id from notification_fixture), now())), 'processing', 'eligible delivery is claimed for provider processing');
select isnt((select outbound_attempt_started_at from public.notification_deliveries where id = (select delivery_id from notification_fixture)), null::timestamptz, 'provider attempt state is persisted before send');

insert into public.notification_deliveries (
  workspace_id, share_id, session_id, channel, recipient,
  notification_kind, status, payload, idempotency_key
)
select workspace_id, share_id, session_id, 'email', 'notification-delivery@example.com',
       'view_opened', 'pending', '{}'::jsonb, 'notification-test-settings-disabled'
from notification_fixture;

update public.notification_settings
set view_opened = false
where workspace_id = (select workspace_id from notification_fixture);

select is((select status from public.notification_deliveries where idempotency_key = 'notification-test-settings-disabled'), 'cancelled', 'disabled preferences cancel queued delivery proactively');

update public.notification_settings
set view_opened = true
where workspace_id = (select workspace_id from notification_fixture);

insert into public.notification_deliveries (
  workspace_id, share_id, session_id, channel, recipient,
  notification_kind, status, payload, idempotency_key
)
select workspace_id, share_id, session_id, 'email', 'notification-delivery@example.com',
       'view_opened', 'pending', '{}'::jsonb, 'notification-test-destination-changed'
from notification_fixture;

update public.notification_settings
set destination_email = 'new-destination@example.com',
    email_verified = true
where workspace_id = (select workspace_id from notification_fixture);

select is((select status from public.notification_deliveries where idempotency_key = 'notification-test-destination-changed'), 'cancelled', 'changing a verified destination cancels queued delivery proactively');

update public.notification_settings
set destination_email = 'notification-delivery@example.com',
    email_verified = true
where workspace_id = (select workspace_id from notification_fixture);

insert into public.notification_deliveries (
  workspace_id, share_id, session_id, channel, recipient,
  notification_kind, status, payload, idempotency_key
)
select workspace_id, share_id, session_id, 'email', 'notification-delivery@example.com',
       'view_opened', 'pending', '{}'::jsonb, 'notification-test-share-revoked'
from notification_fixture;

update public.shares
set revoked_at = now()
where id = (select share_id from notification_fixture);

select is((select status from public.notification_deliveries where idempotency_key = 'notification-test-share-revoked'), 'cancelled', 'share revocation cancels queued delivery proactively');

update public.shares
set revoked_at = null
where id = (select share_id from notification_fixture);

insert into public.notification_deliveries (
  workspace_id, share_id, session_id, channel, recipient,
  notification_kind, status, payload, idempotency_key
)
select workspace_id, share_id, session_id, 'email', 'notification-delivery@example.com',
       'view_opened', 'pending', '{}'::jsonb, 'notification-test-workspace-deleting'
from notification_fixture;

update public.workspaces
set status = 'deleting'
where id = (select workspace_id from notification_fixture);

select is((select status from public.notification_deliveries where idempotency_key = 'notification-test-workspace-deleting'), 'cancelled', 'workspace deletion cancels queued delivery proactively');

-- The first claimed row has a started outbound attempt. Once its lease is
-- expired, a retry claims the unknown state and never returns processing.
update public.notification_deliveries
set next_retry_at = now() - interval '1 second'
where id = (select delivery_id from notification_fixture);

select is((select status from public.claim_notification_delivery((select delivery_id from notification_fixture), now())), 'provider_result_unknown', 'expired provider attempt becomes unknown instead of being resent');

select * from finish();
rollback;
