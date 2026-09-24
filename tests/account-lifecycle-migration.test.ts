import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924200000_account_lifecycle.sql', 'utf8')
const exchange = readFileSync('lib/shares/exchange.ts', 'utf8')
const viewerSession = readFileSync('lib/auth/viewer-session.ts', 'utf8')
const deletion = readFileSync('lib/account/deletion.ts', 'utf8')
const exportRoute = readFileSync('app/api/account/export/route.ts', 'utf8')

describe('account lifecycle hardening', () => {
  it('checks workspace lifecycle before public share access', () => {
    expect(exchange).toContain("from('workspaces')")
    expect(exchange).toContain("workspace?.status !== 'active'")
    expect(viewerSession).toContain("from('workspaces')")
    expect(viewerSession).toContain("workspace.status !== 'active'")
  })

  it('cleans every workspace-owned data family before Auth deletion', () => {
    for (const table of ['shares', 'notification_settings', 'github_installations', 'repositories', 'viewer_sessions', 'view_events', 'repository_events', 'file_engagement', 'share_access_attempts', 'share_recipients', 'notification_deliveries', 'audit_logs', 'quota_counters', 'workspace_members']) {
      expect(deletion).toContain(table)
    }
    expect(deletion.indexOf("from('workspaces').update")).toBeLessThan(deletion.indexOf("admin.auth.admin.deleteUser"))
    expect(deletion).toContain("status: 'deleting'")
  })

  it('documents the export and deletion privacy behavior', () => {
    expect(exportRoute).toContain('userMetadata')
    expect(readFileSync('lib/legal-content.ts', 'utf8')).toContain('Owners can download an account export')
    expect(readFileSync('lib/legal-content.ts', 'utf8')).toContain('Owners can start account deletion')
    expect(migration).toContain('public shares')
  })
})
