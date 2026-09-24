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
    expect(route).toContain('analytics:')
  })

  it('does not export bearer or provider credentials', () => {
    expect(route).not.toContain('session_token_hash')
    expect(route).not.toContain('viewer_token_hash')
    expect(route).not.toContain('token_hash')
    expect(route).not.toContain('GITHUB_APP_PRIVATE_KEY')
    expect(route).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })
})
