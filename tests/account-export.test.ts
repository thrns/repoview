import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const route = readFileSync('app/api/account/export/route.ts', 'utf8')

describe('account export', () => {
  it('includes owned configuration, recipients, and relevant analytics', () => {
    for (const table of [
      'profiles',
      'workspaces',
      'workspace_members',
      'notification_settings',
      'github_installations',
      'repositories',
      'shares',
      'share_recipients',
      'viewer_sessions',
      'view_events',
      'repository_events',
      'file_engagement',
      'share_access_attempts',
      'notification_deliveries',
      'viewers',
      'audit_logs',
    ]) {
      expect(route).toContain(`from('${table}')`)
    }
    expect(route).toContain('shareRecipients')
    expect(route).toContain('"analytics":')
    expect(route).toContain('ACCOUNT_EXPORT_PAGE_SIZE')
    expect(route).toContain('.range(from, to)')
    expect(route).toContain('accountExportSucceeded')
    expect(route).toContain('accountExportFailed')
  })

  it('does not export bearer or provider credentials', () => {
    expect(route).not.toContain('session_token_hash')
    expect(route).not.toContain('viewer_token_hash')
    expect(route).not.toContain('token_hash')
    expect(route).not.toContain('GITHUB_APP_PRIVATE_KEY')
    expect(route).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('requires step-up confirmation and applies user/workspace throttles', () => {
    expect(route).toContain("operation: 'account-export'")
    expect(route).toContain("authenticated-account-export")
    expect(route).toContain('user:${authData.user.id}')
    expect(route).toContain('workspace:${workspaceId}')
  })

  it('bounds large exports to paged streaming reads', () => {
    expect(route).toContain('const ACCOUNT_EXPORT_PAGE_SIZE = 500')
    expect(route).toContain('new ReadableStream')
    expect(route).toContain('range(from, to)')
    expect(route).not.toContain('Promise.all([')
  })
})
