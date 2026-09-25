-- Corrective request-hardening migration.
-- Resource quota reservations close the check-then-act race between a quota
-- read and the later insert/update. The reservation is short-lived so a
-- crashed request cannot hold capacity forever; the actual resource count is
-- always checked while the workspace/scope advisory lock is held.

create table if not exists public.quota_resource_reservations (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('github-installations', 'enabled-repositories', 'active-shares')),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  resource_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (scope, workspace_id, resource_key)
);

create index if not exists quota_resource_reservations_expiry_idx
  on public.quota_resource_reservations(expires_at);

alter table public.quota_resource_reservations enable row level security;
revoke all on table public.quota_resource_reservations from anon, authenticated;
grant all on table public.quota_resource_reservations to service_role;

create or replace function public.reserve_workspace_resource_quota(
  target_scope text,
  target_workspace_id uuid,
  target_resource_key text,
  target_limit bigint,
  target_expires_at timestamptz
)
returns table (
  allowed boolean,
  already_reserved boolean,
  usage bigint,
  remaining bigint,
  retry_after_seconds integer,
  reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_limit bigint;
  current_usage bigint;
  pending_usage bigint;
  existing_reservation uuid;
  new_reservation uuid;
  retry_seconds integer;
  resource_exists boolean;
begin
  expected_limit := case target_scope
    when 'github-installations' then 10
    when 'enabled-repositories' then 100
    when 'active-shares' then 1000
    else null
  end;

  if expected_limit is null
    or target_limit <> expected_limit
    or target_resource_key is null
    or char_length(trim(target_resource_key)) = 0
    or target_expires_at <= now()
  then
    raise exception 'Invalid resource quota arguments';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'workspace-resource-quota:' || target_scope || ':' || target_workspace_id::text,
    0
  ));

  delete from public.quota_resource_reservations
  where expires_at <= now();

  if target_scope = 'github-installations' then
    select count(*) into current_usage
    from public.github_installations
    where workspace_id = target_workspace_id
      and status in ('active', 'suspended', 'pending_migration');
    resource_exists := false;
    if target_resource_key like 'github-installation:%'
      and substring(target_resource_key from char_length('github-installation:') + 1) ~ '^[0-9]+$'
    then
      select exists(
        select 1 from public.github_installations
        where workspace_id = target_workspace_id
          and status in ('active', 'suspended', 'pending_migration')
          and github_installation_id = substring(target_resource_key from char_length('github-installation:') + 1)::bigint
      ) into resource_exists;
    end if;
  elsif target_scope = 'enabled-repositories' then
    select count(*) into current_usage
    from public.repositories
    where workspace_id = target_workspace_id
      and enabled = true;
    resource_exists := false;
    if target_resource_key like 'repository:%'
      and substring(target_resource_key from char_length('repository:') + 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
      select exists(
        select 1 from public.repositories
        where workspace_id = target_workspace_id
          and enabled = true
          and id = substring(target_resource_key from char_length('repository:') + 1)::uuid
      ) into resource_exists;
    end if;
  else
    select count(*) into current_usage
    from public.shares
    where workspace_id = target_workspace_id
      and revoked_at is null
      and (expires_at is null or expires_at > now());
    select exists(
      select 1 from public.shares
      where workspace_id = target_workspace_id
        and revoked_at is null
        and (expires_at is null or expires_at > now())
        and token_hash = substring(target_resource_key from char_length('share:') + 1)
    ) into resource_exists;
  end if;

  retry_seconds := greatest(1, ceil(extract(epoch from (target_expires_at - now())))::integer);
  if resource_exists then
    return query select true, true, current_usage, greatest(0, target_limit - current_usage), retry_seconds, null::uuid;
    return;
  end if;

  select id into existing_reservation
  from public.quota_resource_reservations
  where scope = target_scope
    and workspace_id = target_workspace_id
    and resource_key = target_resource_key;

  if existing_reservation is not null then
    select count(*) into pending_usage from public.quota_resource_reservations as reservations
    where reservations.scope = target_scope
      and reservations.workspace_id = target_workspace_id;
    return query select true, true, current_usage + pending_usage, greatest(0, target_limit - current_usage - pending_usage), retry_seconds, existing_reservation;
    return;
  end if;

  select count(*) into pending_usage
  from public.quota_resource_reservations
  where scope = target_scope
    and workspace_id = target_workspace_id;

  if current_usage + pending_usage >= target_limit then
    return query select false, false, current_usage + pending_usage, 0::bigint, retry_seconds, null::uuid;
    return;
  end if;

  insert into public.quota_resource_reservations (scope, workspace_id, resource_key, expires_at)
  values (target_scope, target_workspace_id, target_resource_key, target_expires_at)
  returning id into new_reservation;

  return query select true, false, current_usage + pending_usage + 1, target_limit - current_usage - pending_usage - 1, retry_seconds, new_reservation;
end;
$$;

create or replace function public.finalize_workspace_resource_quota(target_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.quota_resource_reservations where id = target_reservation_id;
end;
$$;

revoke all on function public.reserve_workspace_resource_quota(text, uuid, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_workspace_resource_quota(text, uuid, text, bigint, timestamptz) to service_role;
revoke all on function public.finalize_workspace_resource_quota(uuid) from public, anon, authenticated;
grant execute on function public.finalize_workspace_resource_quota(uuid) to service_role;

comment on table public.quota_resource_reservations is
  'Short-lived service-only reservations used to make finite workspace resource quotas safe under concurrent creation.';

-- Client event identity makes analytics inserts idempotent across retries and
-- concurrent requests. Existing rows receive unique identities before the
-- constraint is made strict.
alter table public.view_events add column if not exists event_id uuid;
update public.view_events set event_id = gen_random_uuid() where event_id is null;
alter table public.view_events alter column event_id set default gen_random_uuid();
alter table public.view_events alter column event_id set not null;
create unique index if not exists view_events_event_id_key on public.view_events(event_id);

alter table public.repository_events add column if not exists event_id uuid;
update public.repository_events as repository_events
set event_id = view_events.event_id
from public.view_events
where view_events.id = repository_events.id
  and repository_events.event_id is null;
update public.repository_events set event_id = gen_random_uuid() where event_id is null;
alter table public.repository_events alter column event_id set default gen_random_uuid();
alter table public.repository_events alter column event_id set not null;
create unique index if not exists repository_events_event_id_key on public.repository_events(event_id);

create or replace function public.mirror_view_event_to_repository_event()
returns trigger
language plpgsql
as $$
begin
  insert into public.repository_events (id, event_id, share_id, session_id, viewer_id, event_type, path, metadata, occurred_at, created_at)
  select new.id, new.event_id, new.share_id, new.session_id, sessions.viewer_id, new.event_type, new.path, new.metadata, new.created_at, new.created_at
  from public.viewer_sessions as sessions
  where sessions.id = new.session_id
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on column public.view_events.event_id is
  'Client-generated UUID used to make analytics delivery idempotent across retries.';
