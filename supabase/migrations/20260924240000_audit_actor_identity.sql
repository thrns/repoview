-- Make the authenticated actor column explicit while preserving the original
-- actor_id column for deployments that already contain audit records.
-- System-generated records may keep both actor columns null.

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null;

update public.audit_logs
set actor_user_id = actor_id
where actor_user_id is null
  and actor_id is not null;

create index if not exists audit_logs_workspace_actor_created_idx
  on public.audit_logs(workspace_id, actor_user_id, created_at desc);

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated;
grant all on table public.audit_logs to service_role;

create or replace function public.sync_audit_actor_identity()
returns trigger
language plpgsql
as $$
begin
  -- Keep the legacy column populated for existing exports and SQL tooling while
  -- new application writes use actor_user_id as the canonical name.
  if new.actor_user_id is null and new.actor_id is not null then
    new.actor_user_id = new.actor_id;
  elsif new.actor_id is null and new.actor_user_id is not null then
    new.actor_id = new.actor_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_logs_sync_actor_identity on public.audit_logs;
create trigger audit_logs_sync_actor_identity
before insert or update on public.audit_logs
for each row execute function public.sync_audit_actor_identity();

comment on column public.audit_logs.actor_user_id is
  'Authenticated RepoView user who performed the workspace action; null for system events.';
