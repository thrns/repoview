-- System administration is an operator capability, not a workspace role.
-- No authenticated client policies are created for either table. Grants are
-- made out-of-band by a trusted database operator and are checked server-side.

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role = 'operator'),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_admins_status_idx
  on public.system_admins(status, updated_at desc);

create table if not exists public.system_admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_admin_audit_logs_created_idx
  on public.system_admin_audit_logs(created_at desc, id desc);

create index if not exists system_admin_audit_logs_resource_idx
  on public.system_admin_audit_logs(resource_type, resource_id, created_at desc);

alter table public.system_admins enable row level security;
alter table public.system_admin_audit_logs enable row level security;

revoke all on table public.system_admins from anon, authenticated;
revoke all on table public.system_admin_audit_logs from anon, authenticated;
grant all on table public.system_admins to service_role;
grant all on table public.system_admin_audit_logs to service_role;

drop trigger if exists system_admins_set_updated_at on public.system_admins;
create trigger system_admins_set_updated_at
before update on public.system_admins
for each row execute function public.set_profile_updated_at();

comment on table public.system_admins is
  'Explicit RepoView operator grants. This is intentionally separate from workspace_members.';

comment on table public.system_admin_audit_logs is
  'Server-only audit trail for sensitive RepoView operator actions; it is not a workspace activity feed.';

comment on column public.system_admin_audit_logs.metadata is
  'Sanitized operational metadata only. Never store repository source, credentials, or bearer tokens.';

-- Example grant (run deliberately by a trusted operator after Auth signup):
-- insert into public.system_admins (user_id, granted_by)
-- values ('AUTH_USER_UUID', 'AUTH_GRANTOR_UUID');
