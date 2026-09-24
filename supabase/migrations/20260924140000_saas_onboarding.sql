-- Resumable SaaS onboarding.
--
-- New Auth users already receive their profile and personal workspace from
-- the tenancy trigger. This migration makes that path idempotent, records the
-- compliance checkpoint server-side, and preserves existing owner access.

alter table public.profiles
  add column if not exists profile_completed_at timestamptz,
  add column if not exists terms_version_accepted text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_version_acknowledged text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

alter table public.workspaces
  add column if not exists is_personal boolean not null default false;

-- The pre-existing deployment had one personal workspace and no workspace
-- creation UI. Preserve that workspace as personal while leaving room for a
-- future owner to belong to additional workspaces.
update public.workspaces
set is_personal = true
where owner_id in (select id from public.profiles);

create unique index if not exists workspaces_personal_owner_id_key
  on public.workspaces(owner_id)
  where is_personal;

-- Existing owner data predates resumable onboarding. Grandfather that account
-- so the migration does not interrupt its repositories or share URLs. New
-- accounts cannot reach this path because their profile is created after this
-- migration has been applied and starts with null onboarding fields.
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, created_at),
    terms_version_accepted = coalesce(terms_version_accepted, '2026-09-23'),
    terms_accepted_at = coalesce(terms_accepted_at, created_at),
    privacy_version_acknowledged = coalesce(privacy_version_acknowledged, '2026-09-23'),
    privacy_acknowledged_at = coalesce(privacy_acknowledged_at, created_at),
    onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where exists (
  select 1
  from public.workspaces
  where workspaces.owner_id = profiles.id
);

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
  on conflict (id) do nothing;

  -- The partial unique owner index plus this conflict-safe insert guarantees one
  -- personal workspace per Auth user, even if provisioning is retried.
  insert into public.workspaces (name, slug, owner_id, is_personal)
  values (workspace_name || ' Workspace', 'personal-' || replace(new.id::text, '-', ''), new.id, true)
  on conflict (owner_id) where is_personal do nothing;

  select id into new_workspace_id
  from public.workspaces
  where owner_id = new.id;

  if new_workspace_id is null then
    raise exception 'RepoView could not provision the personal workspace';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.notification_settings (workspace_id)
  values (new_workspace_id)
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

-- Profile display fields remain editable by the authenticated owner, but
-- onboarding compliance fields are written only by the controlled RPC below.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.complete_profile(target_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if char_length(trim(coalesce(target_full_name, ''))) < 1
     or char_length(trim(target_full_name)) > 100 then
    raise exception 'A valid full name is required';
  end if;

  update public.profiles
  set full_name = trim(target_full_name),
      profile_completed_at = coalesce(profile_completed_at, now()),
      terms_version_accepted = '2026-09-23',
      terms_accepted_at = coalesce(terms_accepted_at, now()),
      privacy_version_acknowledged = '2026-09-23',
      privacy_acknowledged_at = coalesce(privacy_acknowledged_at, now()),
      updated_at = now()
  where id = auth.uid()
  returning * into completed_profile;

  if completed_profile.id is null then
    raise exception 'Profile is unavailable';
  end if;

  return completed_profile;
end;
$$;

revoke all on function public.complete_profile(text) from public, anon;
grant execute on function public.complete_profile(text) to authenticated;

comment on column public.profiles.terms_version_accepted is
  'The current RepoView Terms version accepted during onboarding.';
comment on column public.profiles.privacy_version_acknowledged is
  'The current RepoView Privacy Policy version acknowledged during onboarding.';
