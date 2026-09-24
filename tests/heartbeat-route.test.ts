import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { POST } from '../app/api/view/heartbeat/route'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { createSupabaseAdminClient } from '../lib/supabase/admin'

const requireSession = vi.mocked(requireViewerSession)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const shareId = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'

function request(body: unknown) {
  return new Request('https://repoview.test/api/view/heartbeat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('viewer heartbeat route', () => {
  it('requires a valid protected session', async () => {
    requireSession.mockRejectedValue(new Error('unauthorized'))

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(401)
    expect(getAdmin).not.toHaveBeenCalled()
  })

  it('updates last_seen_at without inserting an event', async () => {
    requireSession.mockResolvedValue({ session: { id: sessionId }, share: { workspace_id: 'workspace-1' } } as never)
    const update = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null })
    const eventInsert = vi.fn()
    getAdmin.mockReturnValue({
      from(table: string) {
        if (table === 'viewer_sessions') {
          return { update, eq, select, maybeSingle }
        }
        return { insert: eventInsert }
      },
    } as never)

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ last_seen_at: expect.any(String) })
    expect(eq).toHaveBeenNthCalledWith(1, 'id', sessionId)
    expect(eq).toHaveBeenNthCalledWith(2, 'share_id', shareId)
    expect(select).toHaveBeenCalledWith('id')
    expect(eventInsert).not.toHaveBeenCalled()
  })
})
