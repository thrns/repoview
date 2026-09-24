-- Workspace tenancy foundation.
--
-- The first workspace is deliberately created for the earliest existing Auth
-- user. RepoView's current deployment has one owner; selecting the earliest
-- account makes the backfill deterministic while keeping every existing row.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  notification_email text,
  notify_on_view boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The App credentials remain server-side environment configuration. Each
-- GitHub installation is workspace-owned, and repositories retain the
-- specific installation that granted access to them.
create table public.github_installations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  github_installation_id bigint not null,
  github_account_id bigint not null,
  github_account_login text not null,
  github_account_type text not null check (github_account_type in ('User', 'Organization', 'Bot')),
  repository_selection text not null check (repository_selection in ('all', 'selected')),
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted', 'pending_migration')),
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (github_installation_id),
  unique (workspace_id, id),
  check (github_installation_id > 0 or status = 'pending_migration'),
  check (github_account_id > 0 or status = 'pending_migration')
);

create index github_installations_workspace_idx
  on public.github_installations(workspace_id, created_at desc);

alter table public.repositories add column workspace_id uuid;
alter table public.repositories add column github_installation_id uuid;
alter table public.shares add column workspace_id uuid;
alter table public.share_recipients add column workspace_id uuid;
alter table public.viewer_sessions add column workspace_id uuid;
alter table public.view_events add column workspace_id uuid;
alter table public.notification_deliveries add column workspace_id uuid;
alter table public.viewers add column workspace_id uuid;
alter table public.repository_events add column workspace_id uuid;
alter table public.file_engagement add column workspace_id uuid;
alter table public.share_access_attempts add column workspace_id uuid;

do $$
declare
  current_owner_id uuid;
  personal_workspace_id uuid;
  legacy_installation_record_id uuid;
begin
  select id
    into current_owner_id
  from auth.users
  order by created_at asc nulls last, id asc
  limit 1;

  if current_owner_id is null then
    raise exception 'RepoView tenancy migration requires an existing Auth owner account';
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  select
    users.id,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
    users.raw_user_meta_data ->> 'avatar_url'
  from auth.users as users
  on conflict (id) do nothing;

  insert into public.workspaces (name, slug, owner_id)
  values (
    'Personal Workspace',
    'personal-' || replace(current_owner_id::text, '-', ''),
    current_owner_id
  )
  returning id into personal_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (personal_workspace_id, current_owner_id, 'owner');

  insert into public.notification_settings (workspace_id)
  values (personal_workspace_id);

  -- Preserve the existing owner's installation row and repository links while
  -- the one-time deployment migration fills its provider/account metadata.
  -- Runtime requests never use these placeholder values; the row is blocked
  -- by status until migrate:github-installation has completed.
  insert into public.github_installations (
    workspace_id,
    github_installation_id,
    github_account_id,
    github_account_login,
    github_account_type,
    repository_selection,
    status
  )
  values (
    personal_workspace_id,
    0,
    0,
    'legacy-migration-required',
    'User',
    'selected',
    'pending_migration'
  )
  returning id into legacy_installation_record_id;

  update public.repositories
  set workspace_id = personal_workspace_id,
      github_installation_id = legacy_installation_record_id
  where workspace_id is null;

  update public.shares as shares
  set workspace_id = repositories.workspace_id
  from public.repositories as repositories
  where repositories.id = shares.repository_id
    and shares.workspace_id is null;

  update public.share_recipients as recipients
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = recipients.share_id
    and recipients.workspace_id is null;

  update public.viewer_sessions as sessions
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = sessions.share_id
    and sessions.workspace_id is null;

  update public.view_events as events
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = events.share_id
    and events.workspace_id is null;

  update public.notification_deliveries as deliveries
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = deliveries.share_id
    and deliveries.workspace_id is null;

  update public.repository_events as events
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = events.share_id
    and events.workspace_id is null;

  update public.file_engagement as engagement
  set workspace_id = shares.workspace_id
  from public.shares as shares
  where shares.id = engagement.share_id
    and engagement.workspace_id is null;

  update public.share_access_attempts as attempts
  set workspace_id = coalesce(shares.workspace_id, personal_workspace_id)
  from public.shares as shares
  where shares.id = attempts.share_id
    and attempts.workspace_id is null;

  update public.share_access_attempts
  set workspace_id = personal_workspace_id
  where workspace_id is null;

  update public.viewers as viewers
  set workspace_id = coalesce(
    (
      select sessions.workspace_id
      from public.viewer_sessions as sessions
      where sessions.viewer_id = viewers.id
      order by sessions.first_seen_at asc
      limit 1
    ),
    personal_workspace_id
  )
  where viewers.workspace_id is null;
end;
$$;

alter table public.repositories alter column workspace_id set not null;
alter table public.repositories alter column github_installation_id set not null;
alter table public.shares alter column workspace_id set not null;
alter table public.share_recipients alter column workspace_id set not null;
alter table public.viewer_sessions alter column workspace_id set not null;
alter table public.view_events alter column workspace_id set not null;
alter table public.notification_deliveries alter column workspace_id set not null;
alter table public.viewers alter column workspace_id set not null;
alter table public.repository_events alter column workspace_id set not null;
alter table public.file_engagement alter column workspace_id set not null;

alter table public.repositories
  drop constraint if exists repositories_github_owner_github_repo_key;
alter table public.repositories
  add constraint repositories_workspace_name_key unique (workspace_id, github_owner, github_repo);
alter table public.repositories
  add constraint repositories_workspace_id_key unique (workspace_id, id);

alter table public.viewers
  drop constraint if exists viewers_viewer_token_hash_key;
alter table public.viewers
  add constraint viewers_workspace_token_hash_key unique (workspace_id, viewer_token_hash);

alter table public.repositories
  add constraint repositories_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.repositories
  add constraint repositories_workspace_github_installation_fk
  foreign key (workspace_id, github_installation_id)
  references public.github_installations(workspace_id, id)
  on delete restrict;
alter table public.shares
  add constraint shares_workspace_id_key unique (workspace_id, id);
alter table public.shares
  add constraint shares_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.shares
  add constraint shares_workspace_repository_fk foreign key (workspace_id, repository_id) references public.repositories(workspace_id, id) on delete cascade;
alter table public.share_recipients
  add constraint share_recipients_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.share_recipients
  add constraint share_recipients_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.viewer_sessions
  add constraint viewer_sessions_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.viewer_sessions
  add constraint viewer_sessions_workspace_id_key unique (workspace_id, id);
alter table public.viewer_sessions
  add constraint viewer_sessions_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.view_events
  add constraint view_events_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.view_events
  add constraint view_events_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.view_events
  add constraint view_events_workspace_session_fk foreign key (workspace_id, session_id) references public.viewer_sessions(workspace_id, id) on delete cascade;
alter table public.notification_deliveries
  add constraint notification_deliveries_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.notification_deliveries
  add constraint notification_deliveries_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.notification_deliveries
  add constraint notification_deliveries_workspace_session_fk foreign key (workspace_id, session_id) references public.viewer_sessions(workspace_id, id) on delete cascade;
alter table public.viewers
  add constraint viewers_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.viewers
  add constraint viewers_workspace_id_key unique (workspace_id, id);
alter table public.viewer_sessions
  add constraint viewer_sessions_workspace_viewer_fk foreign key (workspace_id, viewer_id) references public.viewers(workspace_id, id);
alter table public.repository_events
  add constraint repository_events_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.repository_events
  add constraint repository_events_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.repository_events
  add constraint repository_events_workspace_session_fk foreign key (workspace_id, session_id) references public.viewer_sessions(workspace_id, id) on delete cascade;
alter table public.file_engagement
  add constraint file_engagement_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.file_engagement
  add constraint file_engagement_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;
alter table public.file_engagement
  add constraint file_engagement_workspace_session_fk foreign key (workspace_id, session_id) references public.viewer_sessions(workspace_id, id) on delete cascade;
alter table public.file_engagement
  add constraint file_engagement_workspace_viewer_fk foreign key (workspace_id, viewer_id) references public.viewers(workspace_id, id);
alter table public.share_access_attempts
  add constraint share_access_attempts_workspace_fk foreign key (workspace_id) references public.workspaces(id) on delete cascade;
alter table public.share_access_attempts
  add constraint share_access_attempts_workspace_share_fk foreign key (workspace_id, share_id) references public.shares(workspace_id, id) on delete cascade;

create index repositories_workspace_idx on public.repositories(workspace_id, created_at desc);
create index repositories_github_installation_idx on public.repositories(github_installation_id, created_at desc);
create index shares_workspace_idx on public.shares(workspace_id, created_at desc);
create index workspace_members_user_idx on public.workspace_members(user_id, created_at desc);
create index viewer_sessions_workspace_idx on public.viewer_sessions(workspace_id, last_seen_at desc);
create index view_events_workspace_idx on public.view_events(workspace_id, created_at desc);
create index notification_deliveries_workspace_idx on public.notification_deliveries(workspace_id, created_at desc);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_profile_updated_at();

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function public.set_profile_updated_at();

create trigger notification_settings_set_updated_at
before update on public.notification_settings
for each row execute function public.set_profile_updated_at();

create trigger github_installations_set_updated_at
before update on public.github_installations
for each row execute function public.set_profile_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members as members
    where members.workspace_id = target_workspace_id
      and members.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members as members
    where members.workspace_id = target_workspace_id
      and members.user_id = auth.uid()
      and members.role = any(allowed_roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  workspace_name text;
begin
  workspace_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Personal Workspace'
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = excluded.avatar_url;

  insert into public.workspaces (name, slug, owner_id)
  values (workspace_name || ' Workspace', 'personal-' || replace(new.id::text, '-', ''), new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into public.notification_settings (workspace_id)
  values (new_workspace_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep the legacy view_events write path compatible with the now-scoped
-- repository_events mirror table.
create or replace function public.mirror_view_event_to_repository_event()
returns trigger
language plpgsql
as $$
begin
  insert into public.repository_events (id, workspace_id, share_id, session_id, viewer_id, event_type, path, metadata, occurred_at, created_at)
  select new.id, new.workspace_id, new.share_id, new.session_id, sessions.viewer_id, new.event_type, new.path, new.metadata, new.created_at, new.created_at
  from public.viewer_sessions as sessions
  where sessions.id = new.session_id
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.notification_settings enable row level security;
alter table public.github_installations enable row level security;

-- Existing application tables were already RLS-enabled by the base migration;
-- these policies now make membership the only authenticated access path.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy workspaces_select_member on public.workspaces
  for select using (public.is_workspace_member(id));
create policy workspaces_update_admin on public.workspaces
  for update using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));

create policy workspace_members_select_member on public.workspace_members
  for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id));
create policy workspace_members_manage_admin on public.workspace_members
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy notification_settings_member on public.notification_settings
  for select using (public.is_workspace_member(workspace_id));
create policy notification_settings_admin on public.notification_settings
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy github_installations_member on public.github_installations
  for select using (public.is_workspace_member(workspace_id));
create policy github_installations_admin on public.github_installations
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy repositories_member on public.repositories
  for select using (public.is_workspace_member(workspace_id));
create policy repositories_admin on public.repositories
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy shares_member on public.shares
  for select using (public.is_workspace_member(workspace_id));
create policy shares_admin on public.shares
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy share_recipients_member on public.share_recipients
  for select using (public.is_workspace_member(workspace_id));
create policy share_recipients_admin on public.share_recipients
  for all using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy viewer_sessions_member on public.viewer_sessions
  for select using (public.is_workspace_member(workspace_id));
create policy view_events_member on public.view_events
  for select using (public.is_workspace_member(workspace_id));
create policy notification_deliveries_member on public.notification_deliveries
  for select using (public.is_workspace_member(workspace_id));
create policy viewers_member on public.viewers
  for select using (public.is_workspace_member(workspace_id));
create policy repository_events_member on public.repository_events
  for select using (public.is_workspace_member(workspace_id));
create policy file_engagement_member on public.file_engagement
  for select using (public.is_workspace_member(workspace_id));
create policy share_access_attempts_member on public.share_access_attempts
  for select using (public.is_workspace_member(workspace_id));
