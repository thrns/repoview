-- Move customer notification delivery fully into workspace-scoped settings.
-- The old NOTIFICATION_TO_EMAIL environment variable was a product-wide
-- fallback; customer notifications must never use it.

alter table public.notification_settings
  rename column notification_email to destination_email;

alter table public.notification_settings
  rename column notify_on_view to view_opened;

alter table public.notification_settings
  rename column notify_on_returning_view to returning_view;

alter table public.notification_settings
  rename column notify_on_download to download;

alter table public.notification_settings
  rename column notify_on_session_summary to session_summary;

alter table public.notification_settings
  rename column notify_on_security_alert to security_alerts;

alter table public.notification_settings
  add column email_verified boolean not null default false;

-- Preserve an explicitly configured legacy destination when it exists. For
-- workspaces that only relied on the old global owner inbox, use the current
-- workspace owner's confirmed account email as the safe destination.
update public.notification_settings as settings
set destination_email = coalesce(nullif(trim(settings.destination_email), ''), nullif(trim(users.email), '')),
    email_verified = (
      users.email_confirmed_at is not null
      and nullif(lower(trim(settings.destination_email)), '') = lower(trim(users.email))
    ) or (
      nullif(trim(settings.destination_email), '') is null
      and users.email_confirmed_at is not null
      and users.email is not null
    ),
    updated_at = now()
from public.workspaces as workspaces
join auth.users as users on users.id = workspaces.owner_id
where settings.workspace_id = workspaces.id;

-- Keep the migration safe for any workspace created before its settings row
-- existed, and initialize it from that workspace's owner.
insert into public.notification_settings (workspace_id, destination_email, email_verified)
select workspaces.id, users.email, users.email_confirmed_at is not null
from public.workspaces as workspaces
join auth.users as users on users.id = workspaces.owner_id
where not exists (
  select 1
  from public.notification_settings as settings
  where settings.workspace_id = workspaces.id
);

-- New accounts start with their own account email as the candidate
-- destination. It only becomes eligible when Supabase marks that email
-- confirmed.
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

  insert into public.notification_settings (workspace_id, destination_email, email_verified)
  values (new_workspace_id, new.email, new.email_confirmed_at is not null);

  return new;
end;
$$;

-- When an account confirms or changes its email, update the default candidate
-- only while it still represents the account email. A separately configured
-- destination remains unverified until an explicit verification flow is added.
create or replace function public.sync_owner_notification_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email or new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.notification_settings as settings
    set destination_email = new.email,
        email_verified = new.email_confirmed_at is not null,
        updated_at = now()
    from public.workspaces as workspaces
    where workspaces.id = settings.workspace_id
      and workspaces.owner_id = new.id
      and (settings.destination_email is null or lower(settings.destination_email) = lower(old.email));
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_notification_email_changed on auth.users;
create trigger on_auth_user_notification_email_changed
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_owner_notification_email();

comment on column public.notification_settings.destination_email is 'Workspace notification destination; only used when email_verified is true.';
comment on column public.notification_settings.email_verified is 'Whether RepoView has verified the current destination email.';
