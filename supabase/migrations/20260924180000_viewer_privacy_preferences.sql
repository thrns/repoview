-- Viewer privacy choices are separate from the optional cross-session viewer
-- identity. A preference token is only issued after a viewer makes a choice;
-- it is not used as an analytics identity.
create table if not exists public.viewer_privacy_preferences (
  id uuid primary key default gen_random_uuid(),
  preference_key_hash text not null unique,
  analytics_mode text not null default 'necessary',
  gpc_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (analytics_mode in ('necessary', 'optional'))
);

alter table public.viewer_sessions
  add column if not exists analytics_mode text not null default 'necessary',
  add column if not exists gpc_applied boolean not null default false;

alter table public.viewer_sessions
  drop constraint if exists viewer_sessions_analytics_mode_check;

alter table public.viewer_sessions
  add constraint viewer_sessions_analytics_mode_check
  check (analytics_mode in ('necessary', 'optional'));

-- Viewer identities are workspace-scoped. This prevents a single optional
-- identity row from being reused as a cross-workspace analytics key.
alter table public.viewers
  drop constraint if exists viewers_viewer_token_hash_key;

create unique index if not exists viewers_workspace_token_hash_idx
  on public.viewers(workspace_id, viewer_token_hash);

create index if not exists viewer_sessions_analytics_mode_idx
  on public.viewer_sessions(analytics_mode, last_seen_at desc);

create trigger viewer_privacy_preferences_set_updated_at
before update on public.viewer_privacy_preferences
for each row execute function public.set_updated_at();

alter table public.viewer_privacy_preferences enable row level security;

comment on table public.viewer_privacy_preferences is
  'Server-side viewer analytics preferences. The raw preference token is only held in a secure first-party cookie.';
