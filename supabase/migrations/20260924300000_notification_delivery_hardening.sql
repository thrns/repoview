-- Harden queued transactional email delivery.
--
-- A delivery is revalidated under a row lock immediately before its provider
-- call. Once a provider attempt starts, an expired lease is never treated as
-- permission to send the same message again: the result becomes
-- provider_result_unknown and needs operator/provider reconciliation.

alter table public.notification_deliveries
  add column if not exists outbound_attempt_key text,
  add column if not exists outbound_attempt_started_at timestamptz;

update public.notification_deliveries
set outbound_attempt_key = coalesce(outbound_attempt_key, idempotency_key, id::text)
where outbound_attempt_key is null;

alter table public.notification_deliveries
  alter column outbound_attempt_key set default gen_random_uuid()::text,
  alter column outbound_attempt_key set not null;

create unique index if not exists notification_deliveries_outbound_attempt_key_idx
  on public.notification_deliveries(outbound_attempt_key);

alter table public.notification_deliveries
  drop constraint if exists notification_deliveries_status_check;

-- Rows from the pre-hardening ledger had no reliable provider outcome. Keep
-- them fail-closed rather than allowing a retry to send a possible duplicate.
update public.notification_deliveries
set status = 'provider_result_unknown',
    last_error = 'Provider result requires reconciliation.',
    next_retry_at = null
where status in ('failed', 'processing');

alter table public.notification_deliveries
  add constraint notification_deliveries_status_check check (
    status in ('pending', 'processing', 'sent', 'retryable', 'permanent', 'cancelled', 'provider_result_unknown')
  );

comment on column public.notification_deliveries.outbound_attempt_key is
  'Stable provider idempotency key for this queued notification. It is reused only for explicit provider reconciliation, never for an automatic retry after an unknown result.';
comment on column public.notification_deliveries.outbound_attempt_started_at is
  'Set before contacting the external provider. A stale processing row with this value is provider_result_unknown and must not be resent automatically.';

-- Cancel only work that has not started an external provider attempt. A
-- processing row that already contacted the provider must be reconciled as
-- unknown, not rewritten as cancelled.
create or replace function public.cancel_pending_notification_deliveries(
  target_workspace_id uuid,
  target_share_id uuid default null,
  target_reason text default 'Notification is no longer permitted.'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cancelled_count integer;
begin
  update public.notification_deliveries as deliveries
  set status = 'cancelled',
      last_error = left(target_reason, 240),
      next_retry_at = null
  where deliveries.workspace_id = target_workspace_id
    and (target_share_id is null or deliveries.share_id = target_share_id)
    and (
      deliveries.status in ('pending', 'retryable')
      or (
        deliveries.status = 'processing'
        and deliveries.outbound_attempt_started_at is null
      )
    );

  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$$;

-- Revoking a share, disabling a destination/preference, or entering deletion
-- state must stop queued work regardless of which server path made the change.
create or replace function public.cancel_notification_deliveries_for_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    perform public.cancel_pending_notification_deliveries(new.workspace_id, new.id, 'Share was revoked.');
  end if;
  return new;
end;
$$;

drop trigger if exists shares_cancel_notification_deliveries on public.shares;
create trigger shares_cancel_notification_deliveries
after update of revoked_at on public.shares
for each row execute function public.cancel_notification_deliveries_for_share();

create or replace function public.cancel_notification_deliveries_for_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.destination_email is distinct from new.destination_email
     or old.email_verified is distinct from new.email_verified
     or old.view_opened is distinct from new.view_opened
     or old.returning_view is distinct from new.returning_view
     or old.session_summary is distinct from new.session_summary then
    perform public.cancel_pending_notification_deliveries(new.workspace_id, null, 'Notification settings changed.');
  end if;
  return new;
end;
$$;

drop trigger if exists notification_settings_cancel_deliveries on public.notification_settings;
create trigger notification_settings_cancel_deliveries
after update of destination_email, email_verified, view_opened, returning_view, session_summary on public.notification_settings
for each row execute function public.cancel_notification_deliveries_for_settings();

create or replace function public.cancel_notification_deliveries_for_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status in ('deleting', 'deleted') then
    perform public.cancel_pending_notification_deliveries(new.id, null, 'Workspace is unavailable.');
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_cancel_notification_deliveries on public.workspaces;
create trigger workspaces_cancel_notification_deliveries
after update of status on public.workspaces
for each row execute function public.cancel_notification_deliveries_for_workspace();

-- The function is service-only because it can return tenant delivery rows and
-- is intended to be called by the internal dispatcher, not by a browser.
create or replace function public.claim_notification_delivery(
  target_delivery_id uuid,
  target_now timestamptz default now()
)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = public
as $$
declare
  current_delivery public.notification_deliveries;
  changed_delivery public.notification_deliveries;
begin
  select *
    into current_delivery
  from public.notification_deliveries
  where id = target_delivery_id
  for update;

  if current_delivery.id is null then
    return;
  end if;

  -- A processing lease can expire because the worker died. If the provider
  -- attempt had started, resending could duplicate an accepted email. If it
  -- had not started, it is safe to return the row to the retry queue.
  if current_delivery.status = 'processing' then
    if current_delivery.next_retry_at is null or current_delivery.next_retry_at > target_now then
      return;
    end if;

    if current_delivery.outbound_attempt_started_at is not null then
      update public.notification_deliveries
      set status = 'provider_result_unknown',
          last_error = 'Provider result requires reconciliation.',
          next_retry_at = null
      where id = current_delivery.id
      returning * into changed_delivery;
      return next changed_delivery;
    end if;

    update public.notification_deliveries
    set status = 'retryable',
        next_retry_at = null
    where id = current_delivery.id;
  end if;

  select *
    into current_delivery
  from public.notification_deliveries
  where id = target_delivery_id;

  if current_delivery.status not in ('pending', 'retryable')
     or (current_delivery.next_retry_at is not null and current_delivery.next_retry_at > target_now) then
    return;
  end if;

  -- Workspace, share, repository, and installation checks are all required to
  -- make a queued viewer notification eligible at send time.
  if not exists (
    select 1
    from public.workspaces
    where id = current_delivery.workspace_id
      and status = 'active'
  ) then
    update public.notification_deliveries
    set status = 'cancelled', last_error = 'Workspace is unavailable.', next_retry_at = null
    where id = current_delivery.id
    returning * into changed_delivery;
    return next changed_delivery;
  end if;

  if not exists (
    select 1
    from public.shares as shares
    join public.repositories as repositories
      on repositories.id = shares.repository_id
     and repositories.workspace_id = shares.workspace_id
    join public.github_installations as installations
      on installations.id = repositories.github_installation_id
     and installations.workspace_id = repositories.workspace_id
    where shares.id = current_delivery.share_id
      and shares.workspace_id = current_delivery.workspace_id
      and shares.revoked_at is null
      and (shares.expires_at is null or shares.expires_at > target_now)
      and shares.notify_on_view
      and repositories.enabled
      and installations.status = 'active'
  ) then
    update public.notification_deliveries
    set status = 'cancelled', last_error = 'Share or repository access is no longer active.', next_retry_at = null
    where id = current_delivery.id
    returning * into changed_delivery;
    return next changed_delivery;
  end if;

  if not exists (
    select 1
    from public.notification_settings as settings
    where settings.workspace_id = current_delivery.workspace_id
      and settings.email_verified
      and lower(trim(settings.destination_email)) = lower(trim(current_delivery.recipient))
      and case current_delivery.notification_kind
        when 'view_opened' then settings.view_opened
        when 'session_summary' then settings.session_summary
        else false
      end
  ) then
    update public.notification_deliveries
    set status = 'cancelled', last_error = 'Notification settings no longer permit delivery.', next_retry_at = null
    where id = current_delivery.id
    returning * into changed_delivery;
    return next changed_delivery;
  end if;

  if not exists (
    select 1
    from public.viewer_sessions as sessions
    where sessions.id = current_delivery.session_id
      and sessions.share_id = current_delivery.share_id
      and sessions.workspace_id = current_delivery.workspace_id
      and sessions.confirmed_at is not null
      and not sessions.is_probable_bot
      and (current_delivery.notification_kind <> 'session_summary' or sessions.ended_at is not null)
  ) then
    update public.notification_deliveries
    set status = 'cancelled', last_error = 'Viewer session no longer qualifies for notification.', next_retry_at = null
    where id = current_delivery.id
    returning * into changed_delivery;
    return next changed_delivery;
  end if;

  update public.notification_deliveries
  set status = 'processing',
      attempt_count = attempt_count + 1,
      next_retry_at = target_now + interval '5 minutes',
      outbound_attempt_started_at = target_now,
      last_error = null
  where id = current_delivery.id
  returning * into changed_delivery;

  return next changed_delivery;
end;
$$;

revoke all on function public.cancel_pending_notification_deliveries(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.claim_notification_delivery(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.cancel_pending_notification_deliveries(uuid, uuid, text) to service_role;
grant execute on function public.claim_notification_delivery(uuid, timestamptz) to service_role;

-- Keep account deletion's fail-closed notification transition in the new
-- cancellable state. This is the only changed behavior of that earlier RPC;
-- the full definition remains here so deployed migration history is intact.
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
  where public.workspaces.owner_id = target_user_id;

  select * into existing_job
  from public.account_deletion_jobs
  where user_id = target_user_id and status <> 'completed'
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

  update public.workspaces
  set status = 'deleting',
      deletion_started_at = coalesce(deletion_started_at, now()),
      updated_at = now()
  where id = any(requested_job.workspace_ids);

  update public.shares
  set revoked_at = coalesce(revoked_at, now()), updated_at = now()
  where workspace_id = any(requested_job.workspace_ids) and revoked_at is null;

  update public.notification_deliveries
  set status = 'cancelled', last_error = 'Account deletion requested.', next_retry_at = null
  where workspace_id = any(requested_job.workspace_ids)
    and (
      status in ('pending', 'retryable')
      or (status = 'processing' and outbound_attempt_started_at is null)
    );

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
  set status = 'deleted', suspended_at = null, updated_at = now()
  where workspace_id = any(requested_job.workspace_ids);

  update public.repositories
  set enabled = false, updated_at = now()
  where workspace_id = any(requested_job.workspace_ids);

  return requested_job;
end;
$$;

revoke all on function public.request_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid) to service_role;
