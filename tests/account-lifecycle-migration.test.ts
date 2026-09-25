import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924200000_account_lifecycle.sql', 'utf8')
const exchange = readFileSync('lib/shares/exchange.ts', 'utf8')
const viewerSession = readFileSync('lib/auth/viewer-session.ts', 'utf8')
const deletion = readFileSync('lib/account/deletion.ts', 'utf8')
const deletionJob = readFileSync('lib/account/deletion-job.ts', 'utf8')
const deletionJobMigration = readFileSync('supabase/migrations/20260924290000_resumable_account_deletion.sql', 'utf8')
const deletionDbTest = readFileSync('supabase/tests/account_deletion.test.sql', 'utf8')
const exportRoute = readFileSync('app/api/account/export/route.ts', 'utf8')
const onboarding = readFileSync('lib/auth/onboarding.ts', 'utf8')

describe('account lifecycle hardening', () => {
  it('checks workspace lifecycle before public share access', () => {
    expect(exchange).toContain("from('workspaces')")
    expect(exchange).toContain("workspace?.status !== 'active'")
    expect(viewerSession).toContain("from('workspaces')")
    expect(viewerSession).toContain("workspace.status !== 'active'")
    expect(onboarding).toContain("workspace.status !== 'active'")
  })

  it('queues deletion and resumes every workspace-owned data family before Auth deletion', () => {
    for (const table of ['shares', 'notification_settings', 'github_installations', 'repositories', 'viewer_sessions', 'view_events', 'repository_events', 'file_engagement', 'share_access_attempts', 'share_recipients', 'notification_deliveries', 'audit_logs', 'quota_counters', 'quota_resource_reservations', 'workspace_members', 'workspaces']) {
      expect(deletionJob).toContain(`'${table}'`)
    }
    expect(deletion).toContain("request_account_deletion")
    expect(deletionJob).toContain("phase: 'auth_delete'")
    expect(deletionJob).toContain('admin.auth.admin.deleteUser')
    expect(deletionJobMigration).toContain('create table if not exists public.account_deletion_jobs')
    expect(deletionJobMigration).toContain('status = \'deleting\'')
    expect(deletionJobMigration).toContain('grant execute on function public.claim_account_deletion_job')
    expect(deletionJobMigration).toContain('workspace_ids uuid[]')
    expect(deletionJobMigration).toContain('alter table public.account_deletion_jobs enable row level security')
    expect(deletionJobMigration).toContain('on delete set null')
    expect(deletionDbTest).toContain('repeated deletion request does not create a duplicate job')
  })

  it('documents the export and deletion privacy behavior', () => {
    expect(exportRoute).toContain('userMetadata')
    expect(readFileSync('lib/legal-content.ts', 'utf8')).toContain('Owners can download an account export')
    expect(readFileSync('lib/legal-content.ts', 'utf8')).toContain('Owners can start account deletion')
    expect(migration).toContain('public shares')
  })
})
