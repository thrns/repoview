import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/auth/workspace', () => ({ requireWorkspace: vi.fn(async () => ({ workspace: { id: 'workspace-1' } })) }))

import { createSupabaseServerClient } from '../lib/supabase/server'
import { getDashboardOverview } from '../lib/dashboard/overview'

const getServer = vi.mocked(createSupabaseServerClient)

const repository = {
  id: '11111111-1111-4111-8111-111111111111',
  github_owner: 'octocat', github_repo: 'hello-world', default_branch: 'main', enabled: true, default_rules: {},
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}
const share = {
  id: '22222222-2222-4222-8222-222222222222', repository_id: repository.id, token_hash: 'hash', recipient_label: 'Interview', ref: 'heads/main',
  expires_at: null, revoked_at: null, notify_on_view: true, allow_download: false, rules: {}, note: null, created_by: null,
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}

function result<T>(data: T, error: null = null) {
  return { data, error }
}

function createQuery(value: unknown) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(value)),
  }
  return query
}

describe('dashboard overview', () => {
  it('derives real metrics and enriches recent events', async () => {
    const now = new Date('2026-09-21T00:00:00.000Z')
    let viewEventQuery = 0
    const admin = {
      from(table: string) {
        if (table === 'shares') return createQuery(result([share]))
        if (table === 'repositories') return createQuery(result([repository]))
        if (table === 'viewer_sessions') return createQuery(result([{ id: 'session-1', viewer_id: 'viewer-1', confirmed_at: '2026-09-20T00:00:00.000Z' }]))
        if (table === 'view_events') return viewEventQuery++ === 0
          ? createQuery(result([{ id: 1, created_at: '2026-09-20T00:00:00.000Z' }]))
          : createQuery(result([
            { id: 2, share_id: share.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', metadata: {}, created_at: '2026-09-20T00:00:00.000Z' },
            { id: 3, share_id: share.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', metadata: {}, created_at: '2026-09-19T00:00:00.000Z' },
          ]))
        if (table === 'viewers') return createQuery(result([{ id: 'viewer-1', viewer_code: 'A81F' }]))
        throw new Error(`Unexpected table ${table}`)
      },
    }
    getServer.mockResolvedValue(admin as never)

    const overview = await getDashboardOverview(now)
    expect(overview).toMatchObject({
      activeShares: 1,
      confirmedViews30d: 1,
      uniqueConfirmedSessions30d: 1,
      enabledRepositories: 1,
      recentActivity: [{ recipientLabel: 'Interview', repositoryName: 'octocat/hello-world', path: 'src/index.ts', viewerLabel: 'Anonymous viewer #A81F', eventCount: 2 }],
    })
    expect(overview.viewsOverTime.some((point) => point.value === 1)).toBe(true)
  })

  it('fails closed when an aggregate query fails', async () => {
    const admin = { from: () => createQuery({ data: null, error: new Error('database') }) }
    getServer.mockResolvedValue(admin as never)

    await expect(getDashboardOverview()).rejects.toThrow('overview could not be loaded')
  })

  it('identifies an uninitialized Supabase schema', async () => {
    const admin = { from: () => createQuery({ data: null, error: { code: 'PGRST205' } }) }
    getServer.mockResolvedValue(admin as never)

    await expect(getDashboardOverview()).rejects.toThrow('database schema is not initialized')
  })
})
