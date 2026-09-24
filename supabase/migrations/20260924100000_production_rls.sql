-- Production RLS hardening for workspace tenancy.
--
-- The workspace-tenancy migration established the first policy set. This
-- follow-up makes the policy surface explicit, separates read and mutation
-- privileges, prevents tenant reassignment, and adds the system-owned audit
-- log table. Service-role operations intentionally bypass these policies only
-- from verified public-viewer, webhook, cleanup, and background code paths.

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_workspace_created_idx
  on public.audit_logs(workspace_id, created_at desc);

create index if not exists audit_logs_workspace_resource_idx
  on public.audit_logs(workspace_id, resource_type, resource_id);

-- A resource's tenant is immutable. Moving a row between workspaces would
-- turn an otherwise safe UPDATE into a cross-tenant transfer primitive.
create or replace function public.prevent_workspace_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.protect_workspace_owner()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'workspace owner is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.protect_workspace_owner_membership()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'workspace owner membership cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner'
     and (new.role is distinct from 'owner' or new.user_id is distinct from old.user_id) then
    raise exception 'workspace owner membership cannot be demoted or transferred';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists workspaces_prevent_owner_change on public.workspaces;
create trigger workspaces_prevent_owner_change
before update on public.workspaces
for each row execute function public.protect_workspace_owner();

drop trigger if exists repositories_prevent_workspace_change on public.repositories;
create trigger repositories_prevent_workspace_change
before update on public.repositories
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists github_installations_prevent_workspace_change on public.github_installations;
create trigger github_installations_prevent_workspace_change
before update on public.github_installations
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists shares_prevent_workspace_change on public.shares;
create trigger shares_prevent_workspace_change
before update on public.shares
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists share_recipients_prevent_workspace_change on public.share_recipients;
create trigger share_recipients_prevent_workspace_change
before update on public.share_recipients
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists viewer_sessions_prevent_workspace_change on public.viewer_sessions;
create trigger viewer_sessions_prevent_workspace_change
before update on public.viewer_sessions
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists view_events_prevent_workspace_change on public.view_events;
create trigger view_events_prevent_workspace_change
before update on public.view_events
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists notification_deliveries_prevent_workspace_change on public.notification_deliveries;
create trigger notification_deliveries_prevent_workspace_change
before update on public.notification_deliveries
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists viewers_prevent_workspace_change on public.viewers;
create trigger viewers_prevent_workspace_change
before update on public.viewers
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists repository_events_prevent_workspace_change on public.repository_events;
create trigger repository_events_prevent_workspace_change
before update on public.repository_events
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists file_engagement_prevent_workspace_change on public.file_engagement;
create trigger file_engagement_prevent_workspace_change
before update on public.file_engagement
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists share_access_attempts_prevent_workspace_change on public.share_access_attempts;
create trigger share_access_attempts_prevent_workspace_change
before update on public.share_access_attempts
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists audit_logs_prevent_workspace_change on public.audit_logs;
create trigger audit_logs_prevent_workspace_change
before update on public.audit_logs
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists workspace_members_protect_owner on public.workspace_members;
create trigger workspace_members_protect_owner
before update or delete on public.workspace_members
for each row execute function public.protect_workspace_owner_membership();

drop trigger if exists workspace_members_prevent_workspace_change on public.workspace_members;
create trigger workspace_members_prevent_workspace_change
before update on public.workspace_members
for each row execute function public.prevent_workspace_id_change();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.github_installations enable row level security;
alter table public.repositories enable row level security;
alter table public.shares enable row level security;
alter table public.share_recipients enable row level security;
alter table public.viewer_sessions enable row level security;
alter table public.view_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.viewers enable row level security;
alter table public.repository_events enable row level security;
alter table public.file_engagement enable row level security;
alter table public.share_access_attempts enable row level security;
alter table public.notification_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Replace the broad first-pass policies with explicit per-operation policies.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists workspaces_select_member on public.workspaces;
drop policy if exists workspaces_update_admin on public.workspaces;
drop policy if exists workspace_members_select_member on public.workspace_members;
drop policy if exists workspace_members_manage_admin on public.workspace_members;
drop policy if exists notification_settings_member on public.notification_settings;
drop policy if exists notification_settings_admin on public.notification_settings;
drop policy if exists github_installations_member on public.github_installations;
drop policy if exists github_installations_admin on public.github_installations;
drop policy if exists repositories_member on public.repositories;
drop policy if exists repositories_admin on public.repositories;
drop policy if exists shares_member on public.shares;
drop policy if exists shares_admin on public.shares;
drop policy if exists share_recipients_member on public.share_recipients;
drop policy if exists share_recipients_admin on public.share_recipients;
drop policy if exists viewer_sessions_member on public.viewer_sessions;
drop policy if exists view_events_member on public.view_events;
drop policy if exists notification_deliveries_member on public.notification_deliveries;
drop policy if exists viewers_member on public.viewers;
drop policy if exists repository_events_member on public.repository_events;
drop policy if exists file_engagement_member on public.file_engagement;
drop policy if exists share_access_attempts_member on public.share_access_attempts;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid());

create policy workspaces_select_member on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));

create policy workspaces_update_admin on public.workspaces
  for update to authenticated using (public.has_workspace_role(id, array['owner', 'admin']))
  with check (public.has_workspace_role(id, array['owner', 'admin']));

create policy workspace_members_select_member on public.workspace_members
  for select to authenticated using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

create policy workspace_members_insert_admin on public.workspace_members
  for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and (
      public.has_workspace_role(workspace_id, array['owner'])
      or role in ('member', 'admin')
    )
  );

create policy workspace_members_update_admin on public.workspace_members
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and (
      public.has_workspace_role(workspace_id, array['owner'])
      or role in ('member', 'admin')
    )
  );

create policy workspace_members_delete_admin on public.workspace_members
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy notification_settings_select_member on public.notification_settings
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy notification_settings_insert_admin on public.notification_settings
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy notification_settings_update_admin on public.notification_settings
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy notification_settings_delete_admin on public.notification_settings
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy github_installations_select_member on public.github_installations
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy github_installations_insert_admin on public.github_installations
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy github_installations_update_admin on public.github_installations
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy github_installations_delete_admin on public.github_installations
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy repositories_select_member on public.repositories
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy repositories_insert_admin on public.repositories
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy repositories_update_admin on public.repositories
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy repositories_delete_admin on public.repositories
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy shares_select_member on public.shares
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy shares_insert_admin on public.shares
  for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and (created_by is null or created_by = auth.uid())
  );

create policy shares_update_admin on public.shares
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin'])
    and (created_by is null or created_by = auth.uid())
  );

create policy shares_delete_admin on public.shares
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy share_recipients_select_member on public.share_recipients
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy share_recipients_insert_admin on public.share_recipients
  for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy share_recipients_update_admin on public.share_recipients
  for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy share_recipients_delete_admin on public.share_recipients
  for delete to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- Analytics and viewer identity data is dashboard-readable but system-owned.
-- There are intentionally no authenticated INSERT/UPDATE/DELETE policies.
create policy viewer_sessions_select_member on public.viewer_sessions
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy repository_events_select_member on public.repository_events
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy file_engagement_select_member on public.file_engagement
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy notification_deliveries_select_member on public.notification_deliveries
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy viewers_select_member on public.viewers
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy view_events_select_member on public.view_events
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy share_access_attempts_select_member on public.share_access_attempts
  for select to authenticated using (public.is_workspace_member(workspace_id));

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

-- These helpers are used by RLS predicates and should be callable only by
-- authenticated sessions. The policy executor can still invoke them.
revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.has_workspace_role(uuid, text[]) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, text[]) to authenticated;

comment on table public.audit_logs is 'Workspace-scoped system audit records; writes are restricted to service-role/system operations.';
