-- Keep public viewer capability checks in one database statement. The
-- application supplies only peppered hashes; these functions never receive
-- capability or session credentials.

create or replace function public.resolve_share_capability(target_token_hash text)
returns table (
  authorization_status text,
  share jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when workspaces.id is null or workspaces.status <> 'active' then 'repository_unavailable'
      when shares.revoked_at is not null then 'revoked'
      when shares.expires_at is not null and shares.expires_at <= now() then 'expired'
      when btrim(shares.ref) = '' then 'invalid'
      when repositories.id is null or not repositories.enabled then 'repository_unavailable'
      when installations.id is null or installations.status <> 'active' then 'repository_unavailable'
      else 'authorized'
    end,
    jsonb_build_object(
      'id', shares.id,
      'workspace_id', shares.workspace_id,
      'repository_id', shares.repository_id,
      'share_code', shares.share_code,
      'ref', shares.ref,
      'expires_at', shares.expires_at,
      'created_at', shares.created_at,
      'updated_at', shares.updated_at
    )
  from public.shares
  left join public.workspaces on workspaces.id = shares.workspace_id
  left join public.repositories
    on repositories.id = shares.repository_id
    and repositories.workspace_id = shares.workspace_id
  left join public.github_installations as installations
    on installations.id = repositories.github_installation_id
    and installations.workspace_id = shares.workspace_id
  where shares.token_hash = target_token_hash;
$$;

revoke all on function public.resolve_share_capability(text) from PUBLIC;
revoke all on function public.resolve_share_capability(text) from anon;
revoke all on function public.resolve_share_capability(text) from authenticated;
grant execute on function public.resolve_share_capability(text) to service_role;

create or replace function public.authorize_viewer_session(
  target_session_token_hash text,
  target_share_id uuid,
  target_share_code text
)
returns table (
  authorization_status text,
  session jsonb,
  share jsonb,
  repository jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    decision.authorization_status,
    case when decision.authorization_status = 'authorized' then jsonb_build_object(
      'id', viewer_sessions.id,
      'share_id', viewer_sessions.share_id,
      'workspace_id', viewer_sessions.workspace_id,
      'viewer_id', viewer_sessions.viewer_id,
      'analytics_mode', viewer_sessions.analytics_mode,
      'gpc_applied', viewer_sessions.gpc_applied,
      'last_seen_at', viewer_sessions.last_seen_at,
      'confirmed_at', viewer_sessions.confirmed_at,
      'active_ms', viewer_sessions.active_ms,
      'security_signals', viewer_sessions.security_signals,
      'entry_path', viewer_sessions.entry_path,
      'browser', viewer_sessions.browser,
      'os', viewer_sessions.os,
      'device_type', viewer_sessions.device_type,
      'country', viewer_sessions.country,
      'city', viewer_sessions.city,
      'region', viewer_sessions.region,
      'referrer_host', viewer_sessions.referrer_host,
      'is_probable_bot', viewer_sessions.is_probable_bot,
      'vpn_indication', viewer_sessions.vpn_indication,
      'proxy_indication', viewer_sessions.proxy_indication,
      'tor_indication', viewer_sessions.tor_indication,
      'datacenter_indication', viewer_sessions.datacenter_indication
    ) end,
    case when decision.authorization_status = 'authorized' then jsonb_build_object(
      'id', shares.id,
      'workspace_id', shares.workspace_id,
      'repository_id', shares.repository_id,
      'share_code', shares.share_code,
      'share_type', shares.share_type,
      'recipient_label', shares.recipient_label,
      'ref', shares.ref,
      'expires_at', shares.expires_at,
      'notify_on_view', shares.notify_on_view,
      'allow_download', shares.allow_download,
      'rules', shares.rules
    ) end,
    case when decision.authorization_status = 'authorized' then jsonb_build_object(
      'id', repositories.id,
      'workspace_id', repositories.workspace_id,
      'github_installation_id', repositories.github_installation_id,
      'github_repository_id', repositories.github_repository_id,
      'github_owner', repositories.github_owner,
      'github_repo', repositories.github_repo,
      'enabled', repositories.enabled,
      'default_rules', repositories.default_rules
    ) end
  from public.viewer_sessions
  join public.shares
    on shares.id = viewer_sessions.share_id
    and shares.workspace_id = viewer_sessions.workspace_id
  left join public.workspaces on workspaces.id = shares.workspace_id
  left join public.repositories
    on repositories.id = shares.repository_id
    and repositories.workspace_id = shares.workspace_id
  left join public.github_installations as installations
    on installations.id = repositories.github_installation_id
    and installations.workspace_id = shares.workspace_id
  cross join lateral (
    select case
      when shares.revoked_at is not null then 'revoked'
      when shares.expires_at is not null and shares.expires_at <= now() then 'expired'
      when workspaces.id is null or workspaces.status <> 'active' then 'repository_unavailable'
      when repositories.id is null or not repositories.enabled then 'repository_unavailable'
      when installations.id is null or installations.status <> 'active' then 'repository_unavailable'
      else 'authorized'
    end as authorization_status
  ) as decision
  where viewer_sessions.session_token_hash = target_session_token_hash
    and (
      (target_share_id is not null and target_share_code is null and shares.id = target_share_id)
      or
      (target_share_id is null and target_share_code is not null and shares.share_code = target_share_code)
    );
$$;

revoke all on function public.authorize_viewer_session(text, uuid, text) from PUBLIC;
revoke all on function public.authorize_viewer_session(text, uuid, text) from anon;
revoke all on function public.authorize_viewer_session(text, uuid, text) from authenticated;
grant execute on function public.authorize_viewer_session(text, uuid, text) to service_role;
