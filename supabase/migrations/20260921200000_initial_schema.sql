create extension if not exists pgcrypto;

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  github_owner text not null,
  github_repo text not null,
  default_branch text not null,
  enabled boolean not null default true,
  default_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (github_owner, github_repo)
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  token_hash text not null unique,
  recipient_label text not null,
  ref text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  notify_on_view boolean not null default true,
  allow_download boolean not null default false,
  rules jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.viewer_sessions (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  session_token_hash text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  confirmed_at timestamptz,
  notified_at timestamptz,
  user_agent text,
  browser text,
  os text,
  device_type text,
  country text,
  referrer_host text,
  ip_hash text,
  is_probable_bot boolean not null default false
);

create table public.view_events (
  id bigint generated always as identity primary key,
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  event_type text not null,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  session_id uuid not null references public.viewer_sessions(id) on delete cascade,
  channel text not null default 'email',
  status text not null,
  error_text text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index shares_repository_idx on public.shares(repository_id);
create index shares_active_idx on public.shares(expires_at, revoked_at);
create index viewer_sessions_share_last_seen_idx on public.viewer_sessions(share_id, last_seen_at desc);
create index view_events_share_created_idx on public.view_events(share_id, created_at desc);
create index view_events_session_created_idx on public.view_events(session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger repositories_set_updated_at
before update on public.repositories
for each row execute function public.set_updated_at();

create trigger shares_set_updated_at
before update on public.shares
for each row execute function public.set_updated_at();

alter table public.repositories enable row level security;
alter table public.shares enable row level security;
alter table public.viewer_sessions enable row level security;
alter table public.view_events enable row level security;
alter table public.notification_deliveries enable row level security;
