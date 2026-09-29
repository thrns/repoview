import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/auth/workspace', () => ({ requireWorkspace: vi.fn(async () => ({ workspace: { id: 'workspace-1' } })) }))

import { createSupabaseServerClient } from '../lib/supabase/server'
import { getDashboardOverview, normalizeDashboardRange } from '../lib/dashboard/overview'

const getServer = vi.mocked(createSupabaseServerClient)

const repositoryA = {
  id: '11111111-1111-4111-8111-111111111111',
  github_owner: 'octocat', github_repo: 'hello-world', default_branch: 'main', enabled: true, default_rules: {},
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}
const repositoryB = { ...repositoryA, id: '33333333-3333-4333-8333-333333333333', github_owner: 'repo-view', github_repo: 'dashboard' }
const shareA = {
  id: '22222222-2222-4222-8222-222222222222', repository_id: repositoryA.id, token_hash: 'hash-a', recipient_label: 'Interview', ref: 'heads/main',
  expires_at: null, revoked_at: null, notify_on_view: true, allow_download: false, rules: {}, note: null, created_by: null,
  created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z',
}
const shareB = { ...shareA, id: '44444444-4444-4444-8444-444444444444', repository_id: repositoryB.id, token_hash: 'hash-b' }

function result<T>(data: T, error: null | { code?: string } | Error = null) {
  return { data, error }
}

function createQuery(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(value)),
  }
}

function setupServer({
  repositories = [repositoryA, repositoryB],
  shares = [shareA, shareB],
  sessions = [],
  confirmations = [],
  recentEvents = [],
  analyticsEvents = [],
  viewers = [],
}: {
  repositories?: unknown[]
  shares?: unknown[]
  sessions?: unknown[]
  confirmations?: unknown[]
  recentEvents?: unknown[]
  analyticsEvents?: unknown[]
  viewers?: unknown[]
} = {}) {
  let viewEventQuery = 0
  const admin = {
    from(table: string) {
      if (table === 'shares') return createQuery(result(shares))
      if (table === 'repositories') return createQuery(result(repositories))
      if (table === 'viewer_sessions') return createQuery(result(sessions))
      if (table === 'viewers') return createQuery(result(viewers))
      if (table === 'view_events') {
        const data = viewEventQuery++ === 0 ? confirmations : viewEventQuery === 2 ? recentEvents : analyticsEvents
        return createQuery(result(data))
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }
  getServer.mockResolvedValue(admin as never)
}

describe('dashboard overview', () => {
  const now = new Date('2026-09-21T12:00:00.000Z')

  it('derives real metrics, preserves duplicate file semantics, and enriches activity', async () => {
    setupServer({
      sessions: [
        { id: 'session-1', viewer_id: 'viewer-1', confirmed_at: '2026-09-20T00:00:00.000Z', active_ms: 1500 },
        { id: 'session-2', viewer_id: 'viewer-1', confirmed_at: '2026-09-19T00:00:00.000Z', active_ms: 500 },
      ],
      confirmations: [
        { id: 1, share_id: shareA.id, session_id: 'session-1', created_at: '2026-09-20T00:00:00.000Z' },
      ],
      recentEvents: [
        { id: 2, share_id: shareA.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', metadata: {}, created_at: '2026-09-20T00:00:00.000Z' },
        { id: 3, share_id: shareA.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', metadata: {}, created_at: '2026-09-19T00:00:00.000Z' },
      ],
      analyticsEvents: [
        { share_id: shareA.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', created_at: '2026-09-20T00:00:00.000Z' },
        { share_id: shareA.id, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', created_at: '2026-09-19T00:00:00.000Z' },
        { share_id: shareA.id, session_id: 'session-1', event_type: 'download', path: 'src/index.ts', created_at: '2026-09-20T00:00:00.000Z' },
        { share_id: shareA.id, session_id: 'session-1', event_type: 'copy', path: 'src/index.ts', created_at: '2026-09-20T00:00:00.000Z' },
      ],
      viewers: [{ id: 'viewer-1', viewer_code: 'A81F' }],
    })

    const overview = await getDashboardOverview(now, '7d')

    expect(overview).toMatchObject({
      range: '7d',
      activeShares: 2,
      totalViews: 1,
      uniqueAnonymousViewers: 1,
      returningViewers: 1,
      totalActiveViewingSeconds: 2,
      filesViewed: 1,
      downloads: 1,
      copyEvents: 1,
      enabledRepositories: 2,
      recentActivity: [{ recipientLabel: 'Interview', repositoryName: 'octocat/hello-world', path: 'src/index.ts', viewerLabel: 'Anonymous viewer #A81F', eventCount: 2 }],
    })
    expect(overview.viewsOverTime).toHaveLength(7)
    expect(overview.workspaceSignalsOverTime).toHaveLength(7)
    expect(overview.workspaceSignalsOverTime.some((point) => point.filesViewed === 1 && point.downloads === 1 && point.copies === 1)).toBe(true)
    expect(overview.metricTrends.confirmedViews.changePercent).toBeNull()
  })

  it('supports the selected 30-day range and generates daily view points', async () => {
    setupServer({
      confirmations: [
        { id: 1, share_id: shareA.id, session_id: 'session-1', created_at: '2026-09-20T00:00:00.000Z' },
        { id: 2, share_id: shareB.id, session_id: 'session-2', created_at: '2026-08-29T12:00:00.000Z' },
      ],
      analyticsEvents: [
        { share_id: shareB.id, session_id: 'session-2', event_type: 'repository_opened', path: null, created_at: '2026-08-29T12:00:00.000Z' },
      ],
    })

    const sevenDays = await getDashboardOverview(now, '7d')
    setupServer({
      confirmations: [
        { id: 1, share_id: shareA.id, session_id: 'session-1', created_at: '2026-09-20T00:00:00.000Z' },
        { id: 2, share_id: shareB.id, session_id: 'session-2', created_at: '2026-08-29T12:00:00.000Z' },
      ],
      analyticsEvents: [
        { share_id: shareB.id, session_id: 'session-2', event_type: 'repository_opened', path: null, created_at: '2026-08-29T12:00:00.000Z' },
      ],
    })
    const thirtyDays = await getDashboardOverview(now, '30d')

    expect(sevenDays.totalViews).toBe(1)
    expect(thirtyDays.totalViews).toBe(2)
    expect(thirtyDays.confirmedViews30d).toBe(2)
    expect(thirtyDays.viewsOverTime).toHaveLength(30)
    expect(thirtyDays.viewsOverTime.filter((point) => point.value > 0)).toHaveLength(2)
  })

  it('ranks repositories by confirmed views only, descending with a deterministic tie-break', async () => {
    setupServer({
      confirmations: [
        { id: 1, share_id: shareB.id, session_id: 'session-1', created_at: '2026-09-20T00:00:00.000Z' },
        { id: 2, share_id: shareA.id, session_id: 'session-2', created_at: '2026-09-19T00:00:00.000Z' },
        { id: 3, share_id: shareA.id, session_id: 'session-3', created_at: '2026-09-18T00:00:00.000Z' },
      ],
      analyticsEvents: [
        { share_id: shareB.id, session_id: 'session-1', event_type: 'download', path: 'README.md', created_at: '2026-09-20T00:00:00.000Z' },
        { share_id: shareB.id, session_id: 'session-1', event_type: 'repository_opened', path: null, created_at: '2026-09-20T00:00:00.000Z' },
      ],
    })

    const overview = await getDashboardOverview(now, '7d')

    expect(overview.topRepositories).toEqual([
      { repositoryId: repositoryA.id, repositoryName: 'octocat/hello-world', owner: 'octocat', name: 'hello-world', confirmedViews: 2 },
      { repositoryId: repositoryB.id, repositoryName: 'repo-view/dashboard', owner: 'repo-view', name: 'dashboard', confirmedViews: 1 },
    ])
  })

  it('returns intentional empty states for an empty workspace dataset', async () => {
    setupServer({ repositories: [], shares: [] })

    const overview = await getDashboardOverview(now, '7d')

    expect(overview).toMatchObject({ activeShares: 0, totalViews: 0, uniqueAnonymousViewers: 0, filesViewed: 0, downloads: 0, copyEvents: 0, enabledRepositories: 0, topRepositories: [], recentActivity: [] })
    expect(overview.viewsOverTime).toEqual(expect.arrayContaining(Array.from({ length: 7 }, () => expect.objectContaining({ value: 0 }))))
    expect(overview.workspaceSignalsOverTime.every((point) => point.filesViewed === 0 && point.downloads === 0 && point.copies === 0 && point.uniqueViewers === 0)).toBe(true)
  })

  it('normalizes unsupported query ranges to the safe seven-day default', () => {
    expect(normalizeDashboardRange('30d')).toBe('30d')
    expect(normalizeDashboardRange('7d')).toBe('7d')
    expect(normalizeDashboardRange('90d')).toBe('7d')
    expect(normalizeDashboardRange(['30d', '7d'])).toBe('30d')
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
