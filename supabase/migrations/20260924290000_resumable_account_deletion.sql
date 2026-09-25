-- Durable, fail-closed account deletion jobs.
--
-- This ledger intentionally has no workspace foreign key. Workspace rows and
-- their tenant data are deleted by the job, while this small lifecycle record
-- remains available to explain queued, failed, and completed deletion work.
-- It never stores repository contents or analytics payloads.

create table if not exists public.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  workspace_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'queued'
    check (status in ('queued', 'running', 'failed', 'completed')),
  phase text not null default 'workspace_cleanup'
    check (phase in ('workspace_cleanup', 'account_memberships', 'account_security', 'profile', 'auth_delete', 'completed')),
  cleanup_table_index integer not null default 0 check (cleanup_table_index >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  rows_deleted bigint not null default 0 check (rows_deleted >= 0),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  locked_at timestamptz,
  lock_token uuid,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_deletion_jobs_active_user_idx
  on public.account_deletion_jobs(user_id)
  where user_id is not null and status <> 'completed';

create index if not exists account_deletion_jobs_ready_idx
  on public.account_deletion_jobs(status, next_attempt_at, requested_at);

create trigger account_deletion_jobs_set_updated_at
before update on public.account_deletion_jobs
for each row execute function public.set_profile_updated_at();

alter table public.account_deletion_jobs enable row level security;
revoke all on table public.account_deletion_jobs from anon, authenticated;
grant all on table public.account_deletion_jobs to service_role;

comment on table public.account_deletion_jobs is
  'Service-only resumable account deletion state and minimal lifecycle audit. It never stores repository contents or analytics payloads.';
comment on column public.account_deletion_jobs.workspace_ids is
  'Stable workspace identifiers captured at request time; tenant rows are deleted separately in bounded batches.';
comment on column public.account_deletion_jobs.last_error is
  'Safe retry category only; credentials, repository source, and analytics payloads are never stored.';

-- Existing deployments may already have workspaces stranded in deleting state
-- by the old synchronous endpoint. Queue those owners without touching their
-- rows or attempting a destructive repair in the migration.
insert into public.account_deletion_jobs (user_id, workspace_ids, requested_at, next_attempt_at)
select
  workspaces.owner_id,
  array_agg(workspaces.id order by workspaces.deletion_started_at asc nulls first, workspaces.id asc),
  min(coalesce(workspaces.deletion_started_at, now())),
  now()
from public.workspaces
where workspaces.status = 'deleting'
group by workspaces.owner_id
on conflict (user_id) where user_id is not null and status <> 'completed' do nothing;

create or replace function public.request_account_deletion(target_user_id uuid)
returns public.account_deletion_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_job public.account_deletion_jobs;
  requested_job public.account_deletion_jobs;
  requested_workspace_ids uuid[];
begin
  if target_user_id is null then
    raise exception 'Authentication is required';
  end if;

  -- Do not start a destructive job for a shared workspace. This check is
  -- repeated only while the account still owns the workspace; later retries
  -- operate on the persisted identifier set and are safe after memberships
  -- have already been removed.
  if exists (
    select 1
    from public.workspaces as workspaces
    join public.workspace_members as members on members.workspace_id = workspaces.id
    where workspaces.owner_id = target_user_id
      and members.user_id <> target_user_id
  ) then
    raise exception 'workspace_has_members';
  end if;

  select coalesce(
    array_agg(workspaces.id order by workspaces.created_at asc, workspaces.id asc),
    '{}'::uuid[]
  )
  into requested_workspace_ids
  from public.workspaces
  where workspaces.owner_id = target_user_id;

  select *
    into existing_job
  from public.account_deletion_jobs
  where user_id = target_user_id
    and status <> 'completed'
  order by requested_at asc, id asc
  limit 1
  for update;

  if existing_job.id is null then
    insert into public.account_deletion_jobs (user_id, workspace_ids)
    values (target_user_id, requested_workspace_ids)
    returning * into requested_job;
  else
    update public.account_deletion_jobs
    set status = case when status = 'failed' then 'queued' else status end,
        next_attempt_at = now(),
        last_error = null,
        workspace_ids = (
          select coalesce(array_agg(distinct workspace_id order by workspace_id), '{}'::uuid[])
          from unnest(existing_job.workspace_ids || requested_workspace_ids) as workspace_id
        ),
        updated_at = now()
    where id = existing_job.id
    returning * into requested_job;
  end if;

  -- These are intentionally idempotent and live in the same transaction as
  -- job creation. A successful response always leaves every captured tenant
  -- workspace inaccessible before asynchronous cleanup begins.
  update public.workspaces
  set status = 'deleting',
      deletion_started_at = coalesce(deletion_started_at, now()),
      updated_at = now()
  where id = any(requested_job.workspace_ids);

  update public.shares
  set revoked_at = coalesce(revoked_at, now()),
      updated_at = now()
  where workspace_id = any(requested_job.workspace_ids)
    and revoked_at is null;

  update public.notification_deliveries
  set status = 'permanent',
      last_error = 'account_deletion_requested',
      next_retry_at = null
  where workspace_id = any(requested_job.workspace_ids)
    and status in ('pending', 'processing', 'retryable');

  update public.notification_settings
  set destination_email = null,
      email_verified = false,
      view_opened = false,
      returning_view = false,
      download = false,
      session_summary = false,
      security_alerts = false,
      digest_frequency = 'off',
      updated_at = now()
  where workspace_id = any(requested_job.workspace_ids);

  update public.github_installations
  set status = 'deleted',
      suspended_at = null,
      updated_at = now()
  where workspace_id = any(requested_job.workspace_ids);

  update public.repositories
  set enabled = false,
      updated_at = now()
  where workspace_id = any(requested_job.workspace_ids);

  return requested_job;
end;
$$;

create or replace function public.claim_account_deletion_job(
  target_job_id uuid,
  target_lock_token uuid
)
returns public.account_deletion_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_job public.account_deletion_jobs;
begin
  update public.account_deletion_jobs
  set status = 'running',
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, now()),
      locked_at = now(),
      lock_token = target_lock_token,
      updated_at = now()
  where id = target_job_id
    and (
      (status in ('queued', 'failed') and next_attempt_at <= now())
      or status = 'running' and locked_at < now() - interval '10 minutes'
    )
  returning * into claimed_job;

  return claimed_job;
end;
$$;

revoke all on function public.request_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.claim_account_deletion_job(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid) to service_role;
grant execute on function public.claim_account_deletion_job(uuid, uuid) to service_role;
