-- Repository identity migration.
--
-- GitHub owner/name values are mutable location metadata. GitHub's numeric
-- repository id is the stable external identity, so repository rows and
-- synchronization must use it instead of the current path.

-- The workspace-tenancy migration was refined before it was deployed. Some
-- environments therefore have the first version of that migration recorded
-- as applied: it has workspace_id, but not the repository installation link
-- or the final github_installations shape. Bring those environments forward
-- here before adding the repository identity indexes below. All operations
-- are additive or metadata-only; repository UUIDs and share references are
-- intentionally untouched.

alter table public.github_installations
  add column if not exists github_installation_id bigint;

alter table public.github_installations
  add column if not exists github_account_id bigint;

alter table public.github_installations
  add column if not exists github_account_login text;

alter table public.github_installations
  add column if not exists github_account_type text;

alter table public.github_installations
  add column if not exists repository_selection text;

alter table public.github_installations
  add column if not exists permissions jsonb;

alter table public.github_installations
  add column if not exists status text;

alter table public.github_installations
  add column if not exists suspended_at timestamptz;

do $$
begin
  -- The first workspace-tenancy version called the provider id
  -- installation_id. Copy it before normalizing the new column.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'github_installations'
      and column_name = 'installation_id'
  ) then
    execute $migration$
      update public.github_installations
      set github_installation_id = installation_id
      where github_installation_id is null
        and installation_id is not null
    $migration$;
  end if;
end;
$$;

update public.github_installations
set github_installation_id = coalesce(github_installation_id, 0),
    github_account_id = coalesce(github_account_id, 0),
    github_account_login = coalesce(nullif(btrim(github_account_login), ''), 'legacy-migration-required'),
    github_account_type = coalesce(nullif(github_account_type, ''), 'User'),
    repository_selection = coalesce(nullif(repository_selection, ''), 'selected'),
    permissions = coalesce(permissions, '{}'::jsonb),
    status = coalesce(nullif(status, ''), 'pending_migration');

alter table public.github_installations
  alter column github_installation_id set not null;

alter table public.github_installations
  alter column github_account_id set not null;

alter table public.github_installations
  alter column github_account_login set not null;

alter table public.github_installations
  alter column github_account_type set not null;

alter table public.github_installations
  alter column repository_selection set not null;

alter table public.github_installations
  alter column permissions set not null;

alter table public.github_installations
  alter column status set not null;

-- Remove constraints/indexes from the earlier shape before installing the
-- final multi-installation constraints.
drop index if exists public.github_installations_workspace_enabled_idx;
alter table public.github_installations
  drop constraint if exists github_installations_check;
alter table public.github_installations
  drop constraint if exists github_installations_github_installation_id_check;
alter table public.github_installations
  drop constraint if exists github_installations_github_account_id_check;
alter table public.github_installations
  drop constraint if exists github_installations_github_account_type_check;
alter table public.github_installations
  drop constraint if exists github_installations_repository_selection_check;
alter table public.github_installations
  drop constraint if exists github_installations_status_check;
alter table public.github_installations
  drop constraint if exists github_installations_github_installation_id_key;
alter table public.github_installations
  drop constraint if exists github_installations_workspace_id_id_key;

alter table public.github_installations
  add constraint github_installations_github_installation_id_key
  unique (github_installation_id);

alter table public.github_installations
  add constraint github_installations_workspace_id_id_key
  unique (workspace_id, id);

alter table public.github_installations
  add constraint github_installations_github_account_type_check
  check (github_account_type in ('User', 'Organization', 'Bot'));

alter table public.github_installations
  add constraint github_installations_repository_selection_check
  check (repository_selection in ('all', 'selected'));

alter table public.github_installations
  add constraint github_installations_status_check
  check (status in ('active', 'suspended', 'deleted', 'pending_migration'));

alter table public.github_installations
  add constraint github_installations_github_installation_id_check
  check (github_installation_id > 0 or status = 'pending_migration');

alter table public.github_installations
  add constraint github_installations_github_account_id_check
  check (github_account_id > 0 or status = 'pending_migration');

create index if not exists github_installations_workspace_idx
  on public.github_installations(workspace_id, created_at desc);

-- Older tenancy rows did not retain the installation UUID on repositories.
-- The earlier model allowed one enabled installation per workspace, so use
-- that row to restore the link without changing any repository primary key.
alter table public.repositories
  add column if not exists github_installation_id uuid;

update public.repositories as repositories
set github_installation_id = installations.id
from public.github_installations as installations
where repositories.github_installation_id is null
  and installations.workspace_id = repositories.workspace_id
  and installations.id = (
    select candidate.id
    from public.github_installations as candidate
    where candidate.workspace_id = repositories.workspace_id
    order by candidate.created_at asc, candidate.id asc
    limit 1
  );

do $$
begin
  if exists (
    select 1
    from public.repositories
    where github_installation_id is null
  ) then
    raise exception 'Every repository must belong to a workspace GitHub installation before repository identity migration';
  end if;
end;
$$;

alter table public.repositories
  alter column github_installation_id set not null;

alter table public.repositories
  drop constraint if exists repositories_workspace_github_installation_fk;

alter table public.repositories
  add constraint repositories_workspace_github_installation_fk
  foreign key (workspace_id, github_installation_id)
  references public.github_installations(workspace_id, id)
  on delete restrict;

alter table public.repositories
  add column github_repository_id bigint;

alter table public.repositories
  add column github_node_id text;

alter table public.repositories
  drop constraint if exists repositories_workspace_name_key;

alter table public.repositories
  add constraint repositories_workspace_repository_id_key
  unique (workspace_id, github_repository_id);

alter table public.repositories
  add constraint repositories_github_repository_id_check
  check (github_repository_id is null or github_repository_id > 0);

alter table public.repositories
  add constraint repositories_github_node_id_check
  check (github_node_id is null or btrim(github_node_id) <> '');

create index repositories_workspace_installation_identity_idx
  on public.repositories(workspace_id, github_installation_id, github_repository_id);

create index repositories_workspace_location_idx
  on public.repositories(workspace_id, github_owner, github_repo);

comment on column public.repositories.github_repository_id is
  'Stable GitHub repository identity; nullable only while the one-time legacy sync is pending.';

comment on column public.repositories.github_node_id is
  'GitHub GraphQL node identity captured with github_repository_id.';
