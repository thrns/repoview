import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260924090000_workspace_tenancy.sql'), 'utf8')

describe('workspace tenancy migration', () => {
  it('creates the membership model and workspace-owned configuration tables', () => {
    for (const table of ['profiles', 'workspaces', 'workspace_members', 'notification_settings', 'github_installations']) {
      expect(migration).toContain(`create table public.${table}`)
    }
    expect(migration).toContain("role in ('owner', 'admin', 'member')")
    expect(migration).toContain('create trigger on_auth_user_created')
    expect(migration).toContain('create or replace function public.handle_new_user()')
  })

  it('backfills every owner-controlled and analytics row into the legacy workspace', () => {
    for (const table of ['repositories', 'shares', 'share_recipients', 'viewer_sessions', 'view_events', 'notification_deliveries', 'viewers', 'repository_events', 'file_engagement', 'share_access_attempts']) {
      expect(migration).toContain(`alter table public.${table} add column workspace_id uuid`)
    }
    expect(migration).toContain('select id\n    into current_owner_id\n  from auth.users')
    expect(migration).toContain('set workspace_id = personal_workspace_id')
    expect(migration).toContain('repositories_workspace_name_key unique (workspace_id, github_owner, github_repo)')
    expect(migration).toContain('create policy repositories_member')
    expect(migration).toContain('create policy shares_member')
    expect(migration).toContain('github_account_login text not null')
    expect(migration).toContain('repository_selection text not null')
    expect(migration).toContain('repositories_workspace_github_installation_fk')
    expect(migration).not.toContain('uses_environment_credentials')
    expect(migration).toContain('share_recipients_workspace_share_fk')
    expect(migration).toContain('viewer_sessions_workspace_share_fk')
    expect(migration).toContain('viewer_sessions_workspace_id_key unique (workspace_id, id)')
    expect(migration).toContain('view_events_workspace_session_fk')
    expect(migration).toContain('notification_deliveries_workspace_session_fk')
  })

  it('constrains destructive resource operations to workspace roles', () => {
    expect(migration).toMatch(/create policy repositories_admin on public\.repositories[\s\S]*for all using \(public\.has_workspace_role\(workspace_id, array\['owner', 'admin'\]\)\)/)
    expect(migration).toMatch(/create policy shares_admin on public\.shares[\s\S]*for all using \(public\.has_workspace_role\(workspace_id, array\['owner', 'admin'\]\)\)/)
  })
})
