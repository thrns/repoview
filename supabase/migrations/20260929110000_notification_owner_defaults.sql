-- Repair notification destinations without overwriting an owner's explicit
-- destination. Runtime provisioning performs the same conditional repair for
-- deployments where this migration has not yet been applied.

update public.notification_settings as settings
set destination_email = nullif(trim(users.email), ''),
    email_verified = users.email_confirmed_at is not null,
    updated_at = now()
from public.workspaces as workspaces
join auth.users as users on users.id = workspaces.owner_id
where settings.workspace_id = workspaces.id
  and nullif(trim(settings.destination_email), '') is null
  and nullif(trim(users.email), '') is not null;

insert into public.notification_settings (
  workspace_id,
  destination_email,
  email_verified,
  view_opened
)
select
  workspaces.id,
  nullif(trim(users.email), ''),
  users.email_confirmed_at is not null,
  true
from public.workspaces as workspaces
join auth.users as users on users.id = workspaces.owner_id
where not exists (
  select 1
  from public.notification_settings as settings
  where settings.workspace_id = workspaces.id
)
on conflict (workspace_id) do nothing;

comment on column public.notification_settings.destination_email is
  'Workspace notification destination; defaults to the authenticated owner email and never overwrites an explicit custom destination.';
