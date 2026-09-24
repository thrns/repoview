-- Workspace settings used by the public multi-user dashboard.
--
-- Keep these preferences workspace-scoped so notification delivery and
-- analytics choices cannot leak across tenants.

alter table public.notification_settings
  add column if not exists notify_on_returning_view boolean not null default true,
  add column if not exists notify_on_download boolean not null default false,
  add column if not exists notify_on_session_summary boolean not null default false,
  add column if not exists notify_on_security_alert boolean not null default true,
  add column if not exists digest_frequency text not null default 'off',
  add column if not exists analytics_enabled boolean not null default false,
  add column if not exists analytics_retention_days integer not null default 180;

alter table public.notification_settings
  drop constraint if exists notification_settings_digest_frequency_check;

alter table public.notification_settings
  add constraint notification_settings_digest_frequency_check
  check (digest_frequency in ('off', 'daily', 'weekly'));

alter table public.notification_settings
  drop constraint if exists notification_settings_analytics_retention_days_check;

alter table public.notification_settings
  add constraint notification_settings_analytics_retention_days_check
  check (analytics_retention_days in (30, 90, 180, 365));
