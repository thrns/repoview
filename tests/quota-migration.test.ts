import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924230000_cost_quotas.sql', 'utf8')
const quotaModule = readFileSync('lib/security/quotas.ts', 'utf8')

describe('cost quota safeguards', () => {
  it('creates service-only tenant counters and atomic functions', () => {
    expect(migration).toContain('create table if not exists public.quota_counters')
    expect(migration).toContain('workspace_id uuid not null references public.workspaces(id)')
    expect(migration).toContain('primary key (scope, workspace_id, subject_id, period_start)')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('create or replace function public.consume_workspace_quota')
    expect(migration).toContain('create or replace function public.release_workspace_quota')
    expect(migration).toContain('revoke all on table public.quota_counters from anon, authenticated')
    expect(migration).toContain('grant execute on function public.consume_workspace_quota')
  })

  it('keeps limits centralized and covers every requested cost category', () => {
    for (const scope of [
      'github-installations',
      'enabled-repositories',
      'active-shares',
      'shares-created-daily',
      'analytics-events-session',
      'analytics-events-workspace-daily',
      'downloads-session',
      'notification-emails-workspace-daily',
    ]) {
      expect(quotaModule).toContain(`'${scope}'`)
    }
    expect(quotaModule).toContain('Quota protection is temporarily unavailable.')
    expect(quotaModule).toContain("error: 'quota_exceeded'")
  })
})
