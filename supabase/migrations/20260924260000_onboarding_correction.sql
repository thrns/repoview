-- Correct the onboarding regressions introduced by the notification-destination
-- migration without rewriting any deployed migration history.
--
-- The SQL function below is the current legal-version source of truth. Runtime
-- onboarding reads it through Supabase RPC, and complete_profile() reads it
-- directly, so those checks cannot drift independently.

create or replace function public.current_legal_versions()
returns table (terms_version text, privacy_version text)
language sql
stable
set search_path = public
as $$
  select
    '2026-09-23'::text as terms_version,
    '2026-09-24'::text as privacy_version;
$$;

revoke all on function public.current_legal_versions() from public, anon;
grant execute on function public.current_legal_versions() to authenticated;

-- The earlier onboarding migration creates this index. Keep the corrective
-- migration safe for deployments that reached the later provisioning change
-- through a partially applied migration sequence.
create unique index if not exists workspaces_personal_owner_id_key
  on public.workspaces(owner_id)
  where is_personal;

-- A retry of the broken provisioning function could leave a user-owned
-- workspace marked non-personal. Promote exactly one existing workspace for
-- each owner that has no personal workspace, preserving every workspace row
-- and therefore all repository, share, and URL references.
with candidates as (
  select
    workspaces.id,
    row_number() over (
      partition by workspaces.owner_id
      order by workspaces.created_at asc, workspaces.id asc
    ) as candidate_number
  from public.workspaces
  where not exists (
    select 1
    from public.workspaces as personal_workspaces
    where personal_workspaces.owner_id = workspaces.owner_id
      and personal_workspaces.is_personal
  )
)
update public.workspaces
set is_personal = true
from candidates
where public.workspaces.id = candidates.id
  and candidates.candidate_number = 1;

-- There must be one owner membership, not merely one membership row for the
-- owner user. This invariant also makes retries deterministic.
create unique index if not exists workspace_members_one_owner_per_workspace_key
  on public.workspace_members(workspace_id)
  where role = 'owner';

insert into public.workspace_members (workspace_id, user_id, role)
select workspaces.id, workspaces.owner_id, 'owner'
from public.workspaces
where workspaces.is_personal
on conflict (workspace_id, user_id) do update
set role = excluded.role;

insert into public.notification_settings (workspace_id)
select workspaces.id
from public.workspaces
where workspaces.is_personal
on conflict (workspace_id) do nothing;

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

  -- Do not overwrite an existing profile when Auth retries delivery of the
  -- user-created event or when provisioning is replayed manually.
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  -- The partial unique index plus this conflict-safe insert guarantees one
  -- personal workspace per Auth user, including concurrent retries.
  insert into public.workspaces (name, slug, owner_id, is_personal)
  values (workspace_name || ' Workspace', 'personal-' || replace(new.id::text, '-', ''), new.id, true)
  on conflict (owner_id) where is_personal do nothing;

  select id
    into new_workspace_id
  from public.workspaces
  where owner_id = new.id
    and is_personal
  order by created_at asc, id asc
  limit 1;

  if new_workspace_id is null then
    raise exception 'RepoView could not provision the personal workspace';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do update
  set role = excluded.role;

  insert into public.notification_settings (workspace_id, destination_email, email_verified)
  values (new_workspace_id, new.email, new.email_confirmed_at is not null)
  on conflict (workspace_id) do nothing;

  return new;
end;
$$;

create or replace function public.complete_profile(target_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_profile public.profiles;
  current_terms_version text;
  current_privacy_version text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if char_length(trim(coalesce(target_full_name, ''))) < 1
     or char_length(trim(target_full_name)) > 100 then
    raise exception 'A valid full name is required';
  end if;

  select versions.terms_version, versions.privacy_version
    into current_terms_version, current_privacy_version
  from public.current_legal_versions() as versions;

  if current_terms_version is null or current_privacy_version is null then
    raise exception 'Current legal versions are unavailable';
  end if;

  update public.profiles
  set full_name = trim(target_full_name),
      profile_completed_at = coalesce(profile_completed_at, now()),
      terms_version_accepted = current_terms_version,
      terms_accepted_at = coalesce(terms_accepted_at, now()),
      privacy_version_acknowledged = current_privacy_version,
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
