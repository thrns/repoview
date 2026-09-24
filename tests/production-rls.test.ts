import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260924100000_production_rls.sql'), 'utf8')
const databaseTest = readFileSync(resolve(process.cwd(), 'supabase/tests/rls_workspace.test.sql'), 'utf8')

const protectedTables = [
  'workspaces',
  'workspace_members',
  'github_installations',
  'repositories',
  'shares',
  'share_recipients',
  'viewer_sessions',
  'view_events',
  'notification_deliveries',
  'viewers',
  'repository_events',
  'file_engagement',
  'share_access_attempts',
  'notification_settings',
  'audit_logs',
]

describe('production RLS hardening', () => {
  it('enables RLS and scopes every protected table to authenticated workspace members', () => {
    for (const table of protectedTables) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }

    expect(migration).toContain('for select to authenticated using (public.is_workspace_member(workspace_id))')
    expect(migration).toContain("for select to authenticated using (public.has_workspace_role(workspace_id, array['owner', 'admin']))")
    expect(migration).toContain('public.prevent_workspace_id_change()')
    expect(migration).toContain('github_installations_prevent_workspace_change')
    expect(migration).toContain('workspace_members_prevent_workspace_change')
  })

  it('keeps client mutation policy surface explicit and denies system-owned writes', () => {
    for (const table of ['repositories', 'shares', 'share_recipients', 'notification_settings', 'github_installations']) {
      expect(migration).toContain(`create policy ${table}_insert_admin`)
      expect(migration).toContain(`create policy ${table}_update_admin`)
      expect(migration).toContain(`create policy ${table}_delete_admin`)
    }

    for (const table of ['viewer_sessions', 'repository_events', 'file_engagement', 'audit_logs']) {
      expect(migration).not.toMatch(new RegExp(`create policy ${table}_(insert|update|delete)`))
    }
    expect(migration).toContain('There are intentionally no authenticated INSERT/UPDATE/DELETE policies.')
  })

  it('contains direct pgTAP cross-tenant SELECT, INSERT, UPDATE, and DELETE coverage', () => {
    expect(databaseTest).toContain('select tests.authenticate_as(\'rls-user-a@example.com\')')
    expect(databaseTest).toContain('Cross-tenant SELECTs return no rows')
    expect(databaseTest).toContain('throws_ok')
    expect(databaseTest).toContain('lives_ok')
    expect(databaseTest).toContain('select tests.authenticate_as_service_role()')
    expect(databaseTest).toContain('foreign repository remains unchanged')
    expect(databaseTest).toContain('foreign audit log remains present')
  })

  it('does not allow service-role imports in ordinary dashboard data paths', () => {
    const dashboardFiles = [
      'lib/dashboard/activity.ts',
      'lib/dashboard/overview.ts',
      'lib/dashboard/viewers.ts',
      'lib/repositories/registry.ts',
      'lib/shares/dashboard.ts',
      'lib/shares/detail.ts',
      'app/(admin)/dashboard/shares/[id]/actions.ts',
      'app/(admin)/dashboard/shares/new/actions.ts',
    ]

    for (const file of dashboardFiles) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source, file).not.toContain('createSupabaseAdminClient')
    }
  })
})
