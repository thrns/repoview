import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

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
  const insert = vi.fn().mockResolvedValue({ error: null })
  const admin = {
    from(table: string) {
      return table === 'view_events' ? { ...builder, insert } : builder
    },
  }
  return { admin, builder, insert }
}

describe('viewer view events', () => {
  it('deduplicates the same session/path event within the short window', async () => {
    const { admin, insert } = createAdminMock({ id: 1 })
    getAdmin.mockReturnValue(admin as never)

    await expect(recordViewerViewEvent({
      shareId: 'share-1',
      sessionId: 'session-1',
      eventType: 'file_viewed',
      path: 'src/index.ts',
      now: Date.parse('2026-09-22T00:00:10.000Z'),
    })).resolves.toEqual({ recorded: false })
    expect(insert).not.toHaveBeenCalled()
  })

  it('records a coarse path event when no recent duplicate exists', async () => {
    const { admin, builder, insert } = createAdminMock(null)
    getAdmin.mockReturnValue(admin as never)

    await expect(recordViewerViewEvent({
      shareId: 'share-1',
      sessionId: 'session-1',
      eventType: 'markdown_viewed',
      path: 'README.md',
      metadata: { route: 'root', preview: 'markdown' },
      now: Date.parse('2026-09-22T00:00:10.000Z'),
    })).resolves.toEqual({ recorded: true })
    expect(builder.eq).toHaveBeenCalledWith('path', 'README.md')
    expect(insert).toHaveBeenCalledWith({
      share_id: 'share-1',
      session_id: 'session-1',
      event_type: 'markdown_viewed',
      path: 'README.md',
      metadata: { route: 'root', preview: 'markdown' },
    })
  })
})
