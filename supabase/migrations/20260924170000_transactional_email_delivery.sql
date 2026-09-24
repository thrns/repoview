-- Durable, workspace-scoped transactional email delivery ledger.
-- The message payload is composed before enqueueing so a viewer request never
-- needs to wait for a provider network call. Provider credentials remain in
-- server-only environment configuration.

alter table public.notification_deliveries
  rename column error_text to last_error;

alter table public.notification_deliveries
  add column recipient text,
  add column attempt_count integer not null default 0,
  add column provider_message_id text,
  add column next_retry_at timestamptz,
  add column idempotency_key text;

update public.notification_deliveries as deliveries
set recipient = coalesce(
  (
    select settings.destination_email
    from public.notification_settings as settings
    where settings.workspace_id = deliveries.workspace_id
  ),
  ''
),
idempotency_key = deliveries.notification_kind || ':' || deliveries.session_id::text
where deliveries.recipient is null;

alter table public.notification_deliveries
  alter column recipient set default '',
  alter column recipient set not null,
  alter column idempotency_key set default null;

alter table public.notification_deliveries
  add constraint notification_deliveries_attempt_count_check check (attempt_count >= 0),
  add constraint notification_deliveries_status_check check (status in ('pending', 'processing', 'sent', 'retryable', 'permanent', 'failed'));

-- A previous deployment could have retried an old notification before this
-- ledger existed. Keep the oldest row for each event so the new idempotency
-- index can be applied without creating or deleting a second email.
delete from public.notification_deliveries as duplicate
using public.notification_deliveries as keeper
where duplicate.idempotency_key is not null
  and duplicate.idempotency_key = keeper.idempotency_key
  and duplicate.created_at > keeper.created_at;

create unique index notification_deliveries_idempotency_key_idx
  on public.notification_deliveries(idempotency_key)
  where idempotency_key is not null;

create index notification_deliveries_retry_idx
  on public.notification_deliveries(status, next_retry_at)
  where status in ('pending', 'retryable', 'processing');

comment on column public.notification_deliveries.recipient is
  'Verified workspace notification destination captured when the delivery was queued.';
comment on column public.notification_deliveries.attempt_count is
  'Number of provider dispatch attempts, including the current attempt.';
comment on column public.notification_deliveries.last_error is
  'Safe provider error summary; credentials and provider response bodies are never stored.';
comment on column public.notification_deliveries.idempotency_key is
  'Stable application event key used to prevent duplicate notifications.';
