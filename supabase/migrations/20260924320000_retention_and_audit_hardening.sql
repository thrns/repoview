-- Retention and audit hardening.
--
-- This is intentionally additive. Earlier migrations may already be deployed,
-- so cleanup coverage and lifecycle audit behavior are corrected here without
-- rewriting migration history.

create table if not exists public.account_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  deletion_job_id uuid references public.account_deletion_jobs(id) on delete set null,
  account_key_hash text not null,
  status text not null default 'requested'
    check (status in ('requested', 'running', 'failed', 'completed')),
  deletion_requested_at timestamptz not null default now(),
  deletion_completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists account_lifecycle_audit_job_idx
  on public.account_lifecycle_audit(deletion_job_id)
  where deletion_job_id is not null;

create index if not exists account_lifecycle_audit_retention_idx
  on public.account_lifecycle_audit(updated_at, status, id);

alter table public.account_lifecycle_audit enable row level security;
revoke all on table public.account_lifecycle_audit from anon, authenticated;
grant all on table public.account_lifecycle_audit to service_role;

comment on table public.account_lifecycle_audit is
  'Minimal server-only account deletion lifecycle record. It contains no tenant data, repository contents, analytics, credentials, or email bodies.';
comment on column public.account_lifecycle_audit.account_key_hash is
  'Non-sensitive SHA-256 correlation key derived from the account identifier; the account identifier itself is not retained.';
comment on column public.account_lifecycle_audit.error_code is
  'Bounded internal retry category, never a database/provider error message or request payload.';

create or replace function public.sync_account_lifecycle_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lifecycle_status text;
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null then
      insert into public.account_lifecycle_audit (
        deletion_job_id,
        account_key_hash,
        status,
        deletion_requested_at,
        error_code
      )
      values (
        new.id,
        encode(extensions.digest(new.user_id::text, 'sha256'), 'hex'),
        'requested',
        new.requested_at,
        null
      )
      on conflict (deletion_job_id) where deletion_job_id is not null do nothing;
    end if;
    return new;
  end if;

  lifecycle_status := case new.status
    when 'running' then 'running'
    when 'failed' then 'failed'
    when 'completed' then 'completed'
    else 'requested'
  end;

  update public.account_lifecycle_audit
  set status = lifecycle_status,
      deletion_completed_at = case when lifecycle_status = 'completed' then coalesce(deletion_completed_at, now()) else deletion_completed_at end,
      error_code = case when lifecycle_status = 'failed' then left(new.last_error, 120) else null end,
      updated_at = now()
  where deletion_job_id = new.id;

  return new;
end;
$$;

drop trigger if exists account_deletion_jobs_sync_lifecycle_audit on public.account_deletion_jobs;
create trigger account_deletion_jobs_sync_lifecycle_audit
after insert or update of status, last_error, user_id on public.account_deletion_jobs
for each row execute function public.sync_account_lifecycle_audit();

revoke all on function public.sync_account_lifecycle_audit() from public, anon, authenticated;
grant execute on function public.sync_account_lifecycle_audit() to service_role;

-- Backfill only the minimal correlation record for jobs created before this
-- migration. A deleted Auth user has no recoverable account identifier, so its
-- job UUID is used as a non-sensitive fallback key.
insert into public.account_lifecycle_audit (
  deletion_job_id,
  account_key_hash,
  status,
  deletion_requested_at,
  deletion_completed_at,
  error_code
)
select
  jobs.id,
  encode(extensions.digest(coalesce(jobs.user_id::text, jobs.id::text), 'sha256'), 'hex'),
  case jobs.status
    when 'running' then 'running'
    when 'failed' then 'failed'
    when 'completed' then 'completed'
    else 'requested'
  end,
  jobs.requested_at,
  jobs.completed_at,
  case when jobs.status = 'failed' then left(jobs.last_error, 120) else null end
from public.account_deletion_jobs as jobs
where not exists (
  select 1
  from public.account_lifecycle_audit as existing
  where existing.deletion_job_id = jobs.id
);

create index if not exists github_connection_transactions_expiry_retention_idx
  on public.github_connection_transactions(expires_at, id);

create index if not exists github_webhook_deliveries_retention_idx
  on public.github_webhook_deliveries(received_at, delivery_id);

create index if not exists viewer_privacy_preferences_retention_idx
  on public.viewer_privacy_preferences(updated_at, id);

create index if not exists account_step_up_confirmations_expiry_retention_idx
  on public.account_step_up_confirmations(expires_at, id);

comment on table public.github_webhook_deliveries is
  'Server-only GitHub webhook idempotency ledger; rows are retained for a bounded period and are not an unlimited event archive.';
comment on table public.github_connection_transactions is
  'Short-lived GitHub OAuth transaction state; expired rows are removed by retention cleanup.';
