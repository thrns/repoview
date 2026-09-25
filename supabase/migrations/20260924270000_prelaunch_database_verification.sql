-- Read-only production launch gate.
--
-- The CLI calls this function with the service-role client and only reports
-- failures. This function must never repair production data; every branch is
-- an invariant query and the STABLE marker prevents writes from this path.

create or replace function public.prelaunch_check()
returns table (
  check_name text,
  passed boolean,
  details text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  schema_ready boolean;
  missing_repository_identity_count bigint;
  invalid_repository_installation_count bigint;
  mismatched_repository_installation_count bigint;
  inactive_enabled_repository_count bigint;
  pending_installation_migration_count bigint;
  orphan_share_count bigint;
  orphan_membership_count bigint;
  profiles_without_exactly_one_personal_workspace_count bigint;
  duplicate_personal_owner_count bigint;
  personal_workspaces_without_owner_membership_count bigint;
  workspaces_without_exactly_one_notification_settings_count bigint;
begin
  select
    pg_catalog.to_regclass('public.profiles') is not null
    and pg_catalog.to_regclass('public.workspaces') is not null
    and pg_catalog.to_regclass('public.workspace_members') is not null
    and pg_catalog.to_regclass('public.notification_settings') is not null
    and pg_catalog.to_regclass('public.github_installations') is not null
    and pg_catalog.to_regclass('public.repositories') is not null
    and pg_catalog.to_regclass('public.shares') is not null
    and not exists (
      select 1
      from (
        values
          ('profiles'::text, 'id'::text),
          ('workspaces', 'id'),
          ('workspaces', 'owner_id'),
          ('workspace_members', 'workspace_id'),
          ('workspace_members', 'user_id'),
          ('workspace_members', 'role'),
          ('notification_settings', 'workspace_id'),
          ('github_installations', 'id'),
          ('repositories', 'id'),
          ('repositories', 'enabled'),
          ('shares', 'id'),
          ('shares', 'workspace_id'),
          ('shares', 'repository_id')
      ) as required_columns(table_name, column_name)
      where not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = required_columns.table_name
          and column_name = required_columns.column_name
      )
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'workspaces'
        and column_name = 'is_personal'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'repositories'
        and column_name in ('workspace_id', 'github_installation_id', 'github_repository_id')
      group by table_schema, table_name
      having count(*) = 3
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'github_installations'
        and column_name in ('workspace_id', 'github_installation_id', 'status')
      group by table_schema, table_name
      having count(*) = 3
    )
  into schema_ready;

  if not schema_ready then
    return query
    select
      'database_migrations'::text,
      false,
      'Required tenancy and GitHub identity schema is missing. Apply the database migrations with npx supabase db push, then rerun pnpm prelaunch:check.'::text;
    return;
  end if;

  return query
  select
    'database_migrations'::text,
    true,
    'Required tenancy, workspace settings, GitHub installation, and repository identity schema is present.'::text;

  select count(*)
    into missing_repository_identity_count
  from public.repositories as repositories
  where repositories.github_repository_id is null;

  select count(*)
    into invalid_repository_installation_count
  from public.repositories as repositories
  left join public.github_installations as installations
    on installations.id = repositories.github_installation_id
  where installations.id is null;

  select count(*)
    into mismatched_repository_installation_count
  from public.repositories as repositories
  join public.github_installations as installations
    on installations.id = repositories.github_installation_id
  where installations.workspace_id is distinct from repositories.workspace_id;

  select count(*)
    into inactive_enabled_repository_count
  from public.repositories as repositories
  left join public.github_installations as installations
    on installations.id = repositories.github_installation_id
  where repositories.enabled
    and (installations.id is null or installations.status <> 'active');

  select count(*)
    into pending_installation_migration_count
  from public.github_installations as installations
  where installations.status = 'pending_migration'
     or installations.github_installation_id <= 0
     or installations.github_account_id <= 0;

  select count(*)
    into orphan_share_count
  from public.shares as shares
  left join public.repositories as repositories
    on repositories.id = shares.repository_id
   and repositories.workspace_id = shares.workspace_id
  where repositories.id is null;

  select count(*)
    into orphan_membership_count
  from public.workspace_members as members
  left join public.workspaces as workspaces
    on workspaces.id = members.workspace_id
  left join auth.users as users
    on users.id = members.user_id
  where workspaces.id is null
     or users.id is null;

  select count(*)
    into profiles_without_exactly_one_personal_workspace_count
  from (
    select profiles.id
    from public.profiles as profiles
    left join public.workspaces as workspaces
      on workspaces.owner_id = profiles.id
     and workspaces.is_personal
    group by profiles.id
    having count(workspaces.id) <> 1
  ) as invalid_profiles;

  select count(*)
    into duplicate_personal_owner_count
  from (
    select workspaces.owner_id
    from public.workspaces as workspaces
    where workspaces.is_personal
    group by workspaces.owner_id
    having count(*) > 1
  ) as duplicate_owners;

  select count(*)
    into personal_workspaces_without_owner_membership_count
  from public.workspaces as workspaces
  where workspaces.is_personal
    and (
      (
        select count(*)
        from public.workspace_members as members
        where members.workspace_id = workspaces.id
          and members.role = 'owner'
      ) <> 1
      or not exists (
        select 1
        from public.workspace_members as members
        where members.workspace_id = workspaces.id
          and members.user_id = workspaces.owner_id
          and members.role = 'owner'
      )
    );

  select count(*)
    into workspaces_without_exactly_one_notification_settings_count
  from public.workspaces as workspaces
  where (
    select count(*)
    from public.notification_settings as settings
    where settings.workspace_id = workspaces.id
  ) <> 1;

  return query
  select
    'repository_identity_migration'::text,
    missing_repository_identity_count = 0,
    case
      when missing_repository_identity_count = 0 then 'Every repository has a stable GitHub repository ID.'
      else format('%s repository row(s) still have a null github_repository_id. Run pnpm migrate:github-repository-identities.', missing_repository_identity_count)
    end;

  return query
  select
    'repository_installation_references'::text,
    invalid_repository_installation_count = 0,
    case
      when invalid_repository_installation_count = 0 then 'Every repository references an existing GitHub installation.'
      else format('%s repository row(s) reference a missing GitHub installation. Repair the repository installation link before launch.', invalid_repository_installation_count)
    end;

  return query
  select
    'repository_installation_workspace_alignment'::text,
    mismatched_repository_installation_count = 0,
    case
      when mismatched_repository_installation_count = 0 then 'Every repository and GitHub installation belong to the same workspace.'
      else format('%s repository row(s) cross workspace boundaries through their GitHub installation link. Repair the link before launch.', mismatched_repository_installation_count)
    end;

  return query
  select
    'enabled_repository_installation_status'::text,
    inactive_enabled_repository_count = 0,
    case
      when inactive_enabled_repository_count = 0 then 'Every enabled repository has an active GitHub installation.'
      else format('%s enabled repository row(s) do not have an active GitHub installation. Complete or repair the installation migration before launch.', inactive_enabled_repository_count)
    end;

  return query
  select
    'github_installation_migration'::text,
    pending_installation_migration_count = 0,
    case
      when pending_installation_migration_count = 0 then 'No GitHub installation rows require the legacy installation migration.'
      else format('%s GitHub installation row(s) still require the legacy installation migration. Run GITHUB_APP_INSTALLATION_ID=... pnpm migrate:github-installation.', pending_installation_migration_count)
    end;

  return query
  select
    'orphan_shares'::text,
    orphan_share_count = 0,
    case
      when orphan_share_count = 0 then 'Every share references its repository in the same workspace.'
      else format('%s share row(s) do not reference a valid repository/workspace pair. Repair the data before launch; prelaunch:check never deletes or reassigns shares.', orphan_share_count)
    end;

  return query
  select
    'orphan_workspace_memberships'::text,
    orphan_membership_count = 0,
    case
      when orphan_membership_count = 0 then 'Every workspace membership references an existing workspace and Auth user.'
      else format('%s workspace membership row(s) reference a missing workspace or Auth user. Repair the data before launch.', orphan_membership_count)
    end;

  return query
  select
    'personal_workspace_per_profile'::text,
    profiles_without_exactly_one_personal_workspace_count = 0,
    case
      when profiles_without_exactly_one_personal_workspace_count = 0 then 'Every profile has exactly one personal workspace.'
      else format('%s profile(s) do not have exactly one personal workspace. Repair the data without deleting existing workspaces or shares.', profiles_without_exactly_one_personal_workspace_count)
    end;

  return query
  select
    'unique_personal_workspace_owner'::text,
    duplicate_personal_owner_count = 0,
    case
      when duplicate_personal_owner_count = 0 then 'No personal workspace owner has duplicate personal workspaces.'
      else format('%s personal workspace owner(s) have duplicate personal workspaces. Consolidate only with an explicit, reference-preserving data migration.', duplicate_personal_owner_count)
    end;

  return query
  select
    'personal_workspace_owner_membership'::text,
    personal_workspaces_without_owner_membership_count = 0,
    case
      when personal_workspaces_without_owner_membership_count = 0 then 'Every personal workspace has exactly one owner membership for its owner.'
      else format('%s personal workspace(s) do not have exactly one owner membership for the workspace owner. Repair the membership before launch.', personal_workspaces_without_owner_membership_count)
    end;

  return query
  select
    'workspace_notification_settings'::text,
    workspaces_without_exactly_one_notification_settings_count = 0,
    case
      when workspaces_without_exactly_one_notification_settings_count = 0 then 'Every workspace has exactly one notification_settings row.'
      else format('%s workspace(s) do not have exactly one notification_settings row. Repair the settings rows before launch.', workspaces_without_exactly_one_notification_settings_count)
    end;
end;
$$;

revoke all on function public.prelaunch_check() from public, anon, authenticated;
grant execute on function public.prelaunch_check() to service_role;

comment on function public.prelaunch_check() is
  'Read-only production launch gate. Returns invariant failures and never repairs data.';
