-- Repository identity migration.
--
-- GitHub owner/name values are mutable location metadata. GitHub's numeric
-- repository id is the stable external identity, so repository rows and
-- synchronization must use it instead of the current path.

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
