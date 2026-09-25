import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { formatPrelaunchFailures, runPrelaunchCheck } from './prelaunch-check.mjs'

const migration = readFileSync(new URL('../supabase/migrations/20260924270000_prelaunch_database_verification.sql', import.meta.url), 'utf8')

describe('prelaunch database check', () => {
  it('calls the read-only database verifier and returns every invariant result', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          { check_name: 'repository_identity_migration', passed: true, details: 'ok' },
          { check_name: 'orphan_shares', passed: false, details: '1 orphan share' },
        ],
        error: null,
      }),
    }

    await expect(runPrelaunchCheck(supabase)).resolves.toEqual([
      { check_name: 'repository_identity_migration', passed: true, details: 'ok' },
      { check_name: 'orphan_shares', passed: false, details: '1 orphan share' },
    ])
    expect(supabase.rpc).toHaveBeenCalledWith('prelaunch_check')
  })

  it('renders actionable failures without suggesting an automatic repair', () => {
    const message = formatPrelaunchFailures([
      { check_name: 'github_installation_migration', details: 'Run the legacy migration.' },
    ])

    expect(message).toContain('github_installation_migration')
    expect(message).toContain('Run the legacy migration.')
    expect(message).toContain('No production data was changed')
  })

  it('defines the database gate as a stable, service-role-only function', () => {
    expect(migration).toContain('stable')
    expect(migration).toContain('security definer')
    expect(migration).toContain('grant execute on function public.prelaunch_check() to service_role')
    expect(migration).toContain('revoke all on function public.prelaunch_check() from public, anon, authenticated')
    expect(migration).toContain('never repairs data')

    for (const checkName of [
      'database_migrations',
      'repository_identity_migration',
      'repository_installation_references',
      'repository_installation_workspace_alignment',
      'enabled_repository_installation_status',
      'github_installation_migration',
      'orphan_shares',
      'orphan_workspace_memberships',
      'personal_workspace_per_profile',
      'unique_personal_workspace_owner',
      'personal_workspace_owner_membership',
      'workspace_notification_settings',
    ]) {
      expect(migration).toContain(`'${checkName}'`)
    }
  })
})
