-- Tenant-scoped abuse and cost-control quotas. These counters are separate
-- from request rate limiting: they bound durable product work and resource
-- growth rather than short-lived request frequency.

create table if not exists public.quota_counters (
  scope text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  subject_id text not null,
  period_start timestamptz not null,
  usage bigint not null default 0 check (usage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, workspace_id, subject_id, period_start)
);

create index if not exists quota_counters_workspace_period_idx
  on public.quota_counters(workspace_id, period_start, scope);

alter table public.quota_counters enable row level security;
revoke all on table public.quota_counters from anon, authenticated;
grant all on table public.quota_counters to service_role;

create or replace function public.consume_workspace_quota(
  target_scope text,
  target_workspace_id uuid,
  target_subject_id text,
  target_period_start timestamptz,
  target_reset_at timestamptz,
  target_increment integer,
  target_limit bigint
)
returns table (
  allowed boolean,
  usage bigint,
  remaining bigint,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_usage bigint;
  retry_seconds integer;
begin
  if target_increment <= 0 or target_limit < 0 then
    raise exception 'Invalid quota arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'workspace-quota:' || target_scope || ':' || target_workspace_id::text || ':' || target_subject_id || ':' || target_period_start::text,
    0
  ));

  insert into public.quota_counters (scope, workspace_id, subject_id, period_start, usage)
  values (target_scope, target_workspace_id, target_subject_id, target_period_start, target_increment)
  on conflict (scope, workspace_id, subject_id, period_start)
  do update set usage = public.quota_counters.usage + target_increment, updated_at = now()
  returning public.quota_counters.usage into current_usage;

  retry_seconds := greatest(1, ceil(extract(epoch from (target_reset_at - now())))::integer);

  if current_usage > target_limit then
    update public.quota_counters
    set usage = greatest(0, usage - target_increment), updated_at = now()
    where scope = target_scope
      and workspace_id = target_workspace_id
      and subject_id = target_subject_id
      and period_start = target_period_start;

    return query select false, current_usage - target_increment, 0::bigint, retry_seconds, target_reset_at;
    return;
  end if;

  return query select true, current_usage, target_limit - current_usage, retry_seconds, target_reset_at;
end;
$$;

create or replace function public.release_workspace_quota(
  target_scope text,
  target_workspace_id uuid,
  target_subject_id text,
  target_period_start timestamptz,
  target_increment integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_increment <= 0 then
    raise exception 'Invalid quota release';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'workspace-quota:' || target_scope || ':' || target_workspace_id::text || ':' || target_subject_id || ':' || target_period_start::text,
    0
  ));

  update public.quota_counters
  set usage = greatest(0, usage - target_increment), updated_at = now()
  where scope = target_scope
    and workspace_id = target_workspace_id
    and subject_id = target_subject_id
    and period_start = target_period_start;
end;
$$;

revoke all on function public.consume_workspace_quota(text, uuid, text, timestamptz, timestamptz, integer, bigint) from public, anon, authenticated;
grant execute on function public.consume_workspace_quota(text, uuid, text, timestamptz, timestamptz, integer, bigint) to service_role;
revoke all on function public.release_workspace_quota(text, uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.release_workspace_quota(text, uuid, text, timestamptz, integer) to service_role;

comment on table public.quota_counters is
  'Server-only tenant-scoped counters for abuse and cost-control quotas; no raw IP or browser identifiers are stored.';
