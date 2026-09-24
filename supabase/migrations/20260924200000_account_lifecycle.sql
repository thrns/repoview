-- Account lifecycle and fail-closed deletion state.
--
-- A workspace becomes unavailable before destructive cleanup starts. Public
-- share authorization checks this state, so a partial cleanup can never leave
-- an active share serving repository content.

alter table public.workspaces
  add column if not exists status text not null default 'active',
  add column if not exists deletion_started_at timestamptz,
  add column if not exists deletion_completed_at timestamptz;

alter table public.workspaces
  drop constraint if exists workspaces_status_check;

alter table public.workspaces
  add constraint workspaces_status_check
  check (status in ('active', 'deleting', 'deleted'));

create index if not exists workspaces_status_idx
  on public.workspaces(status, updated_at desc);

-- The owner membership protection remains in place for ordinary membership
-- changes. Account deletion is the one controlled path that may remove the
-- owner membership, and only after the workspace has entered deleting state.
create or replace function public.protect_workspace_owner_membership()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    if exists (
      select 1
      from public.workspaces
      where id = old.workspace_id
        and status in ('deleting', 'deleted')
    ) then
      return old;
    end if;
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

comment on column public.workspaces.status is
  'Workspace lifecycle state. Public shares are available only while active.';
comment on column public.workspaces.deletion_started_at is
  'Set before account cleanup begins; this state immediately closes public shares.';
