import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/security/quotas', () => ({
  reserveQuota: vi.fn(async () => ({ scope: 'analytics-events-session', workspaceId: 'workspace-1', subjectId: 'session-1', periodStart: '1970-01-01T00:00:00.000Z', increment: 1, resetAt: '2026-09-23T00:00:00.000Z' })),
  releaseQuota: vi.fn(async () => undefined),
}))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { recordViewerViewEvent } from '../lib/viewer/view-events'

const getAdmin = vi.mocked(createSupabaseAdminClient)

function createAdminMock(recentEvent: object | null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: recentEvent, error: null }),
  }
  const upsert = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
  })
  const admin = {
    from(table: string) {
      return table === 'view_events' ? { ...builder, upsert } : builder
    },
  }
  return { admin, builder, upsert }
}

describe('viewer view events', () => {
  it('does not write engagement events in necessary-only mode', async () => {
    const { admin, upsert } = createAdminMock(null)
    getAdmin.mockReturnValue(admin as never)

    await expect(recordViewerViewEvent({
      shareId: 'share-1',
      sessionId: 'session-1',
      eventType: 'file_viewed',
      path: 'src/index.ts',
      workspaceId: 'workspace-1',
      analyticsMode: 'necessary',
    })).resolves.toEqual({ recorded: false, reason: 'necessary-only' })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('deduplicates the same session/path event within the short window', async () => {
    const { admin, upsert } = createAdminMock({ id: 1 })
    getAdmin.mockReturnValue(admin as never)

    await expect(recordViewerViewEvent({
      shareId: 'share-1',
      sessionId: 'session-1',
      eventType: 'file_viewed',
      path: 'src/index.ts',
      workspaceId: 'workspace-1',
      analyticsMode: 'optional',
      now: Date.parse('2026-09-22T00:00:10.000Z'),
    })).resolves.toEqual({ recorded: false })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('records a coarse path event when no recent duplicate exists', async () => {
    const { admin, builder, upsert } = createAdminMock(null)
    getAdmin.mockReturnValue(admin as never)

    await expect(recordViewerViewEvent({
      shareId: 'share-1',
      sessionId: 'session-1',
      eventType: 'markdown_viewed',
      path: 'README.md',
      workspaceId: 'workspace-1',
      analyticsMode: 'optional',
      metadata: { route: 'root', preview: 'markdown', query: 'secret source text' },
      now: Date.parse('2026-09-22T00:00:10.000Z'),
    })).resolves.toEqual({ recorded: true })
    expect(builder.eq).toHaveBeenCalledWith('path', 'README.md')
    expect(upsert).toHaveBeenCalledWith({
      workspace_id: 'workspace-1',
      share_id: 'share-1',
      session_id: 'session-1',
      event_id: expect.any(String),
      event_type: 'markdown_viewed',
      path: 'README.md',
      metadata: { route: 'root', preview: 'markdown' },
    }, { onConflict: 'event_id', ignoreDuplicates: true })
  })
})
