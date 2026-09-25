import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { runAccountDeletionCleanup } from '../lib/account/deletion-job'
import { createSupabaseAdminClient } from '../lib/supabase/admin'

const getAdmin = vi.mocked(createSupabaseAdminClient)

type Job = {
  id: string
  user_id: string | null
  workspace_ids: string[]
  status: 'queued' | 'running' | 'failed' | 'completed'
  phase: 'workspace_cleanup' | 'account_memberships' | 'account_security' | 'profile' | 'auth_delete' | 'completed'
  cleanup_table_index: number
  attempt_count: number
  rows_deleted: number
  requested_at: string
  started_at: string | null
  completed_at: string | null
  locked_at: string | null
  lock_token: string | null
  next_attempt_at: string
  last_error: string | null
  created_at: string
  updated_at: string
}

type Fixture = {
  job: Job
  rows: Record<string, Array<Record<string, unknown>>>
  externalMemberships: Array<{ workspace_id: string; user_id: string }>
  failTableDelete: string | null
  failAuthOnce: boolean
  authDeleted: boolean
}

beforeEach(() => vi.clearAllMocks())

describe('resumable account deletion jobs', () => {
  it('records a halfway failure and resumes from the persisted table', async () => {
    const fixture = createFixture()
    fixture.failTableDelete = 'notification_deliveries'
    const admin = createAdminMock(fixture)
    getAdmin.mockReturnValue(admin as never)

    const first = await runAccountDeletionCleanup({ admin: admin as never, batchSize: 10 })
    expect(first.jobsFailed).toBe(1)
    expect(fixture.job.status).toBe('failed')
    expect(fixture.job.cleanup_table_index).toBe(0)
    expect(fixture.job.last_error).toBe('notification_deliveries_delete_failed')

    fixture.failTableDelete = null
    const second = await runAccountDeletionCleanup({ admin: admin as never, batchSize: 10 })
    expect(second.jobsClaimed).toBe(1)
    expect(fixture.job.cleanup_table_index).toBeGreaterThan(1)
    expect(fixture.rows.notification_deliveries).toHaveLength(0)
  })

  it('is safe to retry repeatedly, handles already-deleted rows, queued notifications, and Auth failure', async () => {
    const fixture = createFixture()
    fixture.rows.notification_deliveries = []
    fixture.failAuthOnce = true
    const admin = createAdminMock(fixture)
    getAdmin.mockReturnValue(admin as never)

    let attempts = 0
    while (fixture.job.status !== 'completed' && attempts < 40) {
      await runAccountDeletionCleanup({ admin: admin as never, batchSize: 10 })
      attempts += 1
    }

    expect(fixture.job.status).toBe('completed')
    expect(fixture.job.phase).toBe('completed')
    expect(fixture.authDeleted).toBe(true)
    expect(fixture.job.last_error).toBeNull()
    expect(fixture.rows.notification_deliveries).toHaveLength(0)
    expect(fixture.externalMemberships).toHaveLength(0)
    expect(Object.values(fixture.rows).every((rows) => rows.length === 0)).toBe(true)

    const completedAttemptCount = fixture.job.attempt_count
    await runAccountDeletionCleanup({ admin: admin as never, batchSize: 10 })
    expect(fixture.job.attempt_count).toBe(completedAttemptCount)
  })
})

function createFixture(): Fixture {
  const now = '2026-09-24T12:00:00.000Z'
  const rows: Fixture['rows'] = {}
  for (const table of [
    'notification_deliveries',
    'repository_events',
    'view_events',
    'file_engagement',
    'viewer_sessions',
    'viewers',
    'share_access_attempts',
    'share_recipients',
    'shares',
    'repositories',
    'github_connection_transactions',
    'github_installations',
    'notification_settings',
    'audit_logs',
    'quota_counters',
    'quota_resource_reservations',
    'workspace_members',
    'workspaces',
  ]) {
    rows[table] = [{ id: `${table}-1`, workspace_id: 'workspace-1', user_id: 'user-1' }]
  }
  rows.quota_counters = [{ scope: 'test', workspace_id: 'workspace-1', subject_id: 'user-1', period_start: now }]
  rows.workspace_members = [{ workspace_id: 'workspace-1', user_id: 'user-1' }]
  rows.workspaces = [{ id: 'workspace-1' }]
  rows.account_step_up_confirmations = [{ id: 'step-up-1', user_id: 'user-1' }]
  rows.profiles = [{ id: 'user-1' }]

  return {
    job: {
      id: 'job-1',
      user_id: 'user-1',
      workspace_ids: ['workspace-1'],
      status: 'queued',
      phase: 'workspace_cleanup',
      cleanup_table_index: 0,
      attempt_count: 0,
      rows_deleted: 0,
      requested_at: now,
      started_at: null,
      completed_at: null,
      locked_at: null,
      lock_token: null,
      next_attempt_at: now,
      last_error: null,
      created_at: now,
      updated_at: now,
    },
    rows,
    externalMemberships: [{ workspace_id: 'other-workspace', user_id: 'user-1' }],
    failTableDelete: null,
    failAuthOnce: false,
    authDeleted: false,
  }
}

function createAdminMock(fixture: Fixture) {
  return {
    from(table: string) {
      const state = { operation: 'select' as 'select' | 'delete' | 'update', filters: new Map<string, unknown>() }
      const query: Record<string, unknown> = {}
      query.select = vi.fn(() => { state.operation = 'select'; return query })
      query.delete = vi.fn(() => { state.operation = 'delete'; return query })
      query.update = vi.fn((values: Record<string, unknown>) => { state.operation = 'update'; state.filters.set('__values', values); return query })
      query.eq = vi.fn((column: string, value: unknown) => { state.filters.set(column, value); return query })
      query.in = vi.fn((column: string, value: unknown) => { state.filters.set(column, value); return query })
      query.order = vi.fn(() => query)
      query.limit = vi.fn(() => query)
      query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        try {
          const result = resolveQuery(table, state, fixture)
          return Promise.resolve(result).then(resolve, reject)
        } catch (error) {
          return Promise.reject(error).then(resolve, reject)
        }
      }
      return query
    },
    rpc: vi.fn(async (name: string, args: { target_job_id: string; target_lock_token: string }) => {
      if (name !== 'claim_account_deletion_job' || args.target_job_id !== fixture.job.id) return { data: null, error: null }
      if (fixture.job.status === 'completed') return { data: null, error: null }
      fixture.job.status = 'running'
      fixture.job.lock_token = args.target_lock_token
      fixture.job.attempt_count += 1
      return { data: fixture.job, error: null }
    }),
    auth: {
      admin: {
        deleteUser: vi.fn(async () => {
          if (fixture.failAuthOnce) {
            fixture.failAuthOnce = false
            return { error: { message: 'temporary auth outage' } }
          }
          fixture.authDeleted = true
          fixture.job.user_id = null
          return { error: null }
        }),
      },
    },
  }
}

function resolveQuery(table: string, state: { operation: 'select' | 'delete' | 'update'; filters: Map<string, unknown> }, fixture: Fixture) {
  if (table === 'account_deletion_jobs' && state.operation === 'select') {
    return { data: fixture.job.status === 'completed' ? [] : [fixture.job], error: null }
  }

  if (state.operation === 'update') {
    const values = state.filters.get('__values') as Partial<Job>
    Object.assign(fixture.job, values)
    return { data: null, error: null }
  }

  if (state.operation === 'delete') {
    if (fixture.failTableDelete === table) return { data: null, error: { message: 'injected delete failure' } }
    const rows = fixture.rows[table] ?? []
    fixture.rows[table] = rows.filter((row) => !matchesDelete(row, state.filters))
    return { data: null, error: null }
  }

  if (table === 'workspace_members' && state.filters.get('user_id') === 'user-1' && !state.filters.has('workspace_id')) {
    const rows = fixture.externalMemberships.splice(0)
    return { data: rows, error: null }
  }

  const rows = fixture.rows[table] ?? []
  return { data: rows.slice(0, 10), error: null }
}

function matchesDelete(row: Record<string, unknown>, filters: Map<string, unknown>) {
  for (const [column, expected] of filters) {
    if (column === '__values') continue
    if (Array.isArray(expected)) {
      if (!expected.includes(row[column])) return false
    } else if (row[column] !== expected) {
      return false
    }
  }
  return true
}
