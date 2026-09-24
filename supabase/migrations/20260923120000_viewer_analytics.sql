-- Anonymous viewer analytics. This migration deliberately keeps the original
-- share/session/event tables in place so existing links and dashboards remain
-- compatible while adding the richer analytics model.

alter table public.shares
  add column if not exists share_type text not null default 'recipient';

alter table public.shares
  drop constraint if exists shares_share_type_check;

alter table public.shares
  add constraint shares_share_type_check check (share_type in ('generic', 'recipient'));

alter table public.shares
  alter column recipient_label drop not null;

alter table public.shares
  add column if not exists commit_sha text;

create table if not exists public.share_recipients (
  share_id uuid primary key references public.shares(id) on delete cascade,
  recipient_name text,
  company text,
  email text,
  role_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_name is null or char_length(recipient_name) <= 200),
  check (company is null or char_length(company) <= 200),
  check (email is null or char_length(email) <= 320),
  check (role_notes is null or char_length(role_notes) <= 2000)
);

create table if not exists public.viewers (
  id uuid primary key default gen_random_uuid(),
  viewer_code varchar(4) not null unique,
  viewer_token_hash text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.viewer_sessions
  add column if not exists viewer_id uuid references public.viewers(id) on delete set null,
  add column if not exists ended_at timestamptz,
  add column if not exists active_ms bigint not null default 0,
  add column if not exists idle_ms bigint not null default 0,
  add column if not exists entry_path text,
  add column if not exists exit_path text,
  add column if not exists referrer_url text,
  add column if not exists browser_version text,
  add column if not exists rendering_engine text,
  add column if not exists os_version text,
  add column if not exists architecture text,
  add column if not exists primary_language text,
  add column if not exists languages jsonb,
  add column if not exists browser_timezone text,
  add column if not exists screen_width integer,
  add column if not exists screen_height integer,
  add column if not exists viewport_width integer,
  add column if not exists viewport_height integer,
  add column if not exists pixel_ratio numeric,
  add column if not exists color_depth integer,
  add column if not exists orientation text,
  add column if not exists logical_cpu_count integer,
  add column if not exists approximate_memory_gb numeric,
  add column if not exists touch_capable boolean,
  add column if not exists dark_mode boolean,
  add column if not exists reduced_motion boolean,
  add column if not exists public_ip text,
  add column if not exists ip_version smallint,
  add column if not exists asn text,
  add column if not exists asn_organization text,
  add column if not exists isp_organization text,
  add column if not exists network_classification text,
  add column if not exists vpn_indication boolean,
  add column if not exists proxy_indication boolean,
  add column if not exists tor_indication boolean,
  add column if not exists datacenter_indication boolean,
  add column if not exists http_protocol text,
  add column if not exists region text,
  add column if not exists region_code text,
  add column if not exists city text,
  add column if not exists postal_area text,
  add column if not exists timezone text,
  add column if not exists continent text,
  add column if not exists approximate_latitude numeric,
  add column if not exists approximate_longitude numeric,
  add column if not exists network_key_hash text,
  add column if not exists device_profile_hash text,
  add column if not exists security_signals jsonb not null default '{}'::jsonb,
  add column if not exists visibility_changes integer not null default 0,
  add column if not exists focus_changes integer not null default 0,
  add column if not exists max_directory_depth integer not null default 0,
  add column if not exists session_summary_notified_at timestamptz,
  add column if not exists token_age_seconds integer,
  add column if not exists is_returning_visit boolean not null default false,
  add column if not exists previous_visit_count integer not null default 0;

create index if not exists viewer_sessions_viewer_idx on public.viewer_sessions(viewer_id, first_seen_at desc);
create index if not exists viewer_sessions_network_idx on public.viewer_sessions(share_id, network_key_hash, first_seen_at desc);
create index if not exists viewer_sessions_device_idx on public.viewer_sessions(share_id, device_profile_hash, first_seen_at desc);

-- New canonical name for event consumers. The legacy view_events table remains
-- the write-compatible source for existing application code and migrations.
create table if not exists public.repository_events (
  id bigint primary key,
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  viewer_id uuid references public.viewers(id) on delete set null,
  event_type text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists repository_events_share_created_idx on public.repository_events(share_id, occurred_at desc);
create index if not exists repository_events_session_created_idx on public.repository_events(session_id, occurred_at asc);
create index if not exists repository_events_viewer_created_idx on public.repository_events(viewer_id, occurred_at desc);

create or replace function public.mirror_view_event_to_repository_event()
returns trigger
language plpgsql
as $$
begin
  insert into public.repository_events (id, share_id, session_id, viewer_id, event_type, path, metadata, occurred_at, created_at)
  select new.id, new.share_id, new.session_id, sessions.viewer_id, new.event_type, new.path, new.metadata, new.created_at, new.created_at
  from public.viewer_sessions as sessions
  where sessions.id = new.session_id
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists view_events_repository_events_mirror on public.view_events;
create trigger view_events_repository_events_mirror
after insert on public.view_events
for each row execute function public.mirror_view_event_to_repository_event();

insert into public.repository_events (id, share_id, session_id, viewer_id, event_type, path, metadata, occurred_at, created_at)
select events.id, events.share_id, events.session_id, sessions.viewer_id, events.event_type, events.path, events.metadata, events.created_at, events.created_at
from public.view_events as events
left join public.viewer_sessions as sessions on sessions.id = events.session_id
on conflict (id) do nothing;

create table if not exists public.file_engagement (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  viewer_id uuid references public.viewers(id) on delete set null,
  path text not null,
  content_kind text,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1,
  active_ms bigint not null default 0,
  idle_ms bigint not null default 0,
  max_scroll_percent numeric not null default 0,
  first_view_order integer,
  unique (session_id, path)
);

create index if not exists file_engagement_share_idx on public.file_engagement(share_id, last_viewed_at desc);
create index if not exists file_engagement_viewer_idx on public.file_engagement(viewer_id, last_viewed_at desc);

create table if not exists public.share_access_attempts (
  id uuid primary key default gen_random_uuid(),
  share_id uuid references public.shares(id) on delete cascade,
  token_hash text not null,
  valid boolean not null,
  failure_reason text,
  token_age_seconds integer,
  public_ip text,
  referrer_host text,
  browser text,
  os text,
  device_type text,
  is_probable_bot boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists share_access_attempts_created_idx on public.share_access_attempts(created_at desc);
create index if not exists share_access_attempts_share_idx on public.share_access_attempts(share_id, created_at desc);

alter table public.notification_deliveries
  add column if not exists notification_kind text not null default 'view_opened',
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.share_recipients enable row level security;
alter table public.viewers enable row level security;
alter table public.repository_events enable row level security;
alter table public.file_engagement enable row level security;
alter table public.share_access_attempts enable row level security;

create trigger share_recipients_set_updated_at
before update on public.share_recipients
for each row execute function public.set_updated_at();

-- Existing recipient_label values remain display-compatible. New generic
-- shares may leave both recipient_label and share_recipients empty.
update public.shares
set share_type = case when nullif(trim(recipient_label), '') is null then 'generic' else 'recipient' end
where share_type = 'recipient';
