-- Minimize viewer analytics to product and security signals with a clear use.
--
-- Necessary security processing keeps only a salted IP hash, bot/security
-- indicators, the share token hash, and request lifecycle timestamps. Optional
-- engagement keeps a workspace-scoped anonymous viewer, coarse location,
-- browser/OS/device category, file paths/order, and engagement duration.

drop index if exists public.viewer_sessions_network_idx;
drop index if exists public.viewer_sessions_device_idx;

alter table public.viewer_sessions
  add column if not exists ip_hash text;

alter table public.viewer_sessions
  drop column if exists idle_ms,
  drop column if exists user_agent,
  drop column if exists browser_version,
  drop column if exists rendering_engine,
  drop column if exists os_version,
  drop column if exists architecture,
  drop column if exists primary_language,
  drop column if exists languages,
  drop column if exists browser_timezone,
  drop column if exists screen_width,
  drop column if exists screen_height,
  drop column if exists viewport_width,
  drop column if exists viewport_height,
  drop column if exists pixel_ratio,
  drop column if exists color_depth,
  drop column if exists orientation,
  drop column if exists logical_cpu_count,
  drop column if exists approximate_memory_gb,
  drop column if exists touch_capable,
  drop column if exists dark_mode,
  drop column if exists reduced_motion,
  drop column if exists public_ip,
  drop column if exists ip_version,
  drop column if exists asn,
  drop column if exists asn_organization,
  drop column if exists isp_organization,
  drop column if exists network_classification,
  drop column if exists http_protocol,
  drop column if exists region_code,
  drop column if exists postal_area,
  drop column if exists timezone,
  drop column if exists continent,
  drop column if exists approximate_latitude,
  drop column if exists approximate_longitude,
  drop column if exists referrer_url,
  drop column if exists network_key_hash,
  drop column if exists device_profile_hash,
  drop column if exists visibility_changes,
  drop column if exists focus_changes,
  drop column if exists max_directory_depth,
  drop column if exists token_age_seconds;

alter table public.share_access_attempts
  add column if not exists ip_hash text;

alter table public.share_access_attempts
  drop column if exists public_ip,
  drop column if exists browser,
  drop column if exists os,
  drop column if exists device_type;

alter table public.file_engagement
  drop column if exists idle_ms,
  drop column if exists max_scroll_percent;

create index if not exists viewer_sessions_ip_hash_idx
  on public.viewer_sessions(workspace_id, ip_hash, last_seen_at desc);

create index if not exists share_access_attempts_ip_hash_idx
  on public.share_access_attempts(workspace_id, ip_hash, created_at desc);

comment on column public.viewer_sessions.ip_hash is
  'Salted, workspace-scoped hash used for abuse/security correlation; raw IP is never stored.';
comment on column public.viewer_sessions.city is
  'Coarse provider-supplied city label collected only with optional engagement analytics.';
comment on column public.viewer_sessions.region is
  'Coarse provider-supplied region label collected only with optional engagement analytics.';
comment on column public.viewer_sessions.country is
  'Country code collected only with optional engagement analytics.';
