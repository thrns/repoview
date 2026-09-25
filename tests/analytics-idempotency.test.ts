import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ after: (callback: () => void) => callback() }))
vi.mock('@/lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/security/quotas', () => ({
  reserveQuota: vi.fn(async (_scope: string, _workspaceId: string, _subjectId: string, increment: number) => ({
    scope: 'analytics-events-session',
    workspaceId: 'workspace-1',
    subjectId: 'session-1',
    periodStart: '1970-01-01T00:00:00.000Z',
    increment,
    resetAt: '2026-09-25T00:00:00.000Z',
  })),
  releaseQuota: vi.fn(async () => undefined),
}))

import { requireViewerSession } from '@/lib/auth/viewer-session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { releaseQuota, reserveQuota } from '@/lib/security/quotas'
import { recordViewerAnalytics } from '../lib/viewer/analytics-server'

const getViewer = vi.mocked(requireViewerSession)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const reserve = vi.mocked(reserveQuota)
const release = vi.mocked(releaseQuota)

const viewer = {
  share: { id: 'share-1', workspace_id: 'workspace-1' },
  session: {
    id: 'session-1',
    analytics_mode: 'optional',
    gpc_applied: false,
    security_signals: {},
    active_ms: 0,
  },
  repository: {},
}

function createAdminMock(options: { existingEventIds?: string[]; concurrentInsert?: boolean } = {}) {
  let insertClaimed = false
  const existingEventIds = options.existingEventIds ?? []
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    error: null,
  }
  const existingChain = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: existingEventIds.map((event_id) => ({ event_id })), error: null }),
  }
  const upsert = vi.fn(() => ({
    select: vi.fn().mockResolvedValue({
      data: options.concurrentInsert && insertClaimed ? [] : [{ id: 1, event_id: '00000000-0000-4000-8000-000000000001' }],
      error: null,
    }),
  }))
  upsert.mockImplementation(() => {
    const inserted = !insertClaimed
    insertClaimed = true
    return { select: vi.fn().mockResolvedValue({ data: inserted ? [{ id: 1, event_id: '00000000-0000-4000-8000-000000000001' }] : [], error: null }) }
  })

  const admin = {
    from(table: string) {
      if (table === 'viewer_sessions') return { update: vi.fn(() => updateChain) }
      if (table === 'view_events') return {
        select: vi.fn(() => existingChain),
        upsert,
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }
  return { admin, upsert }
}

beforeEach(() => {
  vi.clearAllMocks()
  getViewer.mockResolvedValue(viewer as never)
})

describe('viewer analytics idempotency', () => {
  it('does not store or reserve a replayed client event', async () => {
    const first = createAdminMock()
    getAdmin.mockReturnValue(first.admin as never)
    const event = { eventId: '00000000-0000-4000-8000-000000000001', eventType: 'search' as const, path: 'src/index.ts' }

    await expect(recordViewerAnalytics({ shareId: 'share-1', events: [event] })).resolves.toMatchObject({ recorded: 1 })

    const second = createAdminMock({ existingEventIds: ['00000000-0000-4000-8000-000000000001'] })
    getAdmin.mockReturnValue(second.admin as never)
    await expect(recordViewerAnalytics({ shareId: 'share-1', events: [event] })).resolves.toMatchObject({ recorded: 0 })

    expect(reserve).toHaveBeenCalledTimes(2)
    expect(second.upsert).not.toHaveBeenCalled()
  })

  it('releases quota when concurrent replay loses the unique event race', async () => {
    const mock = createAdminMock({ concurrentInsert: true })
    getAdmin.mockReturnValue(mock.admin as never)
    const event = { eventId: '00000000-0000-4000-8000-000000000001', eventType: 'search' as const, path: 'src/index.ts' }

    const results = await Promise.all([
      recordViewerAnalytics({ shareId: 'share-1', events: [event] }),
      recordViewerAnalytics({ shareId: 'share-1', events: [event] }),
    ])

    expect(results.map((result) => result.recorded).sort()).toEqual([0, 1])
    expect(reserve).toHaveBeenCalledTimes(4)
    expect(release).toHaveBeenCalledTimes(2)
    expect(release).toHaveBeenCalledWith(expect.objectContaining({ increment: 1 }), expect.anything())
  })
})
