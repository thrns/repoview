-- Automated data retention support.
--
-- Cleanup is performed by a server-only scheduled job. The ledger is kept
-- server-side so operators can distinguish a successful run from a failed or
-- interrupted run without exposing cleanup controls to workspace members.

alter table public.shares
  add column if not exists retention_scrubbed_at timestamptz;

alter table public.viewer_sessions
  add column if not exists network_metadata_scrubbed_at timestamptz;

-- Existing deployments may contain the former 365-day option. The privacy
-- policy's maximum for individual analytics is 180 days, so normalize it
-- before installing the stricter constraint.
update public.notification_settings
set analytics_retention_days = 180
where analytics_retention_days > 180;

alter table public.notification_settings
  drop constraint if exists notification_settings_analytics_retention_days_check;

alter table public.notification_settings
  add constraint notification_settings_analytics_retention_days_check
  check (analytics_retention_days in (30, 90, 180));

create table if not exists public.retention_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed')),
  batch_limit integer not null default 100
    check (batch_limit > 0 and batch_limit <= 1000),
  rows_processed integer not null default 0
    check (rows_processed >= 0),
  details jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists retention_cleanup_runs_job_started_idx
  on public.retention_cleanup_runs(job_name, started_at desc);

create index if not exists viewer_sessions_retention_idx
  on public.viewer_sessions(last_seen_at, id);

create index if not exists viewer_sessions_network_metadata_retention_idx
  on public.viewer_sessions(first_seen_at, network_metadata_scrubbed_at, id);

create index if not exists repository_events_retention_idx
  on public.repository_events(occurred_at, id);

create index if not exists file_engagement_retention_idx
  on public.file_engagement(last_viewed_at, id);

create index if not exists share_access_attempts_retention_idx
  on public.share_access_attempts(created_at, id);

create index if not exists notification_deliveries_retention_idx
  on public.notification_deliveries(created_at, id);

create index if not exists audit_logs_retention_idx
  on public.audit_logs(created_at, id);

create index if not exists shares_retention_idx
  on public.shares(revoked_at, expires_at, retention_scrubbed_at, id);

create index if not exists workspaces_deletion_retention_idx
  on public.workspaces(status, deletion_started_at, id);

alter table public.retention_cleanup_runs enable row level security;

revoke all on table public.retention_cleanup_runs from anon, authenticated;
grant all on table public.retention_cleanup_runs to service_role;

comment on table public.retention_cleanup_runs is
  'Server-only ledger of scheduled retention cleanup executions and failures.';

comment on column public.shares.retention_scrubbed_at is
  'Set after revoked/expired share metadata is minimized while separately retained analytics finish aging out.';

comment on column public.viewer_sessions.network_metadata_scrubbed_at is
  'Set after salted network and coarse location metadata reaches its shorter security retention window from first collection.';
