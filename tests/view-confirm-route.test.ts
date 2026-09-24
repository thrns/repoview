import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({ checkPublicRateLimit: vi.fn(async () => null), checkRateLimits: vi.fn(async () => null), getRequestIp: vi.fn(() => null), rateLimitResponse: vi.fn(), rateLimitUnavailableResponse: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/notifications/notify-view', () => ({ notifyConfirmedViewer: vi.fn().mockResolvedValue({ status: 'already-attempted' }) }))
vi.mock('../lib/viewer/view-events', () => ({ recordViewerViewEvent: vi.fn().mockResolvedValue({ recorded: true }) }))

import { POST } from '../app/api/view/confirm/route'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { notifyConfirmedViewer } from '../lib/notifications/notify-view'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { recordViewerViewEvent } from '../lib/viewer/view-events'

const requireSession = vi.mocked(requireViewerSession)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const notifyViewer = vi.mocked(notifyConfirmedViewer)
const recordViewEvent = vi.mocked(recordViewerViewEvent)
const shareId = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  requireSession.mockClear()
  getAdmin.mockClear()
  notifyViewer.mockClear()
  recordViewEvent.mockClear()
})

function createAdminMock(confirmedSession: object | null, confirmError: object | null = null) {
  const update = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const is = vi.fn().mockReturnThis()
  const select = vi.fn().mockReturnThis()
  const maybeSingle = vi.fn().mockResolvedValue({ data: confirmedSession, error: confirmError })
  const eventInsert = vi.fn().mockResolvedValue({ error: null })
  const admin = {
    from(table: string) {
      if (table === 'viewer_sessions') {
        return { update, eq, is, select, maybeSingle }
      }
      return { insert: eventInsert }
    },
  }
  return { admin, update, eq, is, select, maybeSingle, eventInsert }
}

function request(body: unknown) {
  return new Request('https://repoview.test/api/view/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('view confirmation route', () => {
  it('rejects malformed requests before checking viewer access', async () => {
    const response = await POST(request({ shareId: 'not-a-uuid' }))

    expect(response.status).toBe(400)
    expect(requireSession).not.toHaveBeenCalled()
  })

  it('requires the protected viewer session', async () => {
    requireSession.mockRejectedValue(new Error('unauthorized'))

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(401)
    expect(getAdmin).not.toHaveBeenCalled()
  })

  it('atomically confirms once and records view_confirmed within analytics quotas', async () => {
    requireSession.mockResolvedValue({ session: { id: sessionId, analytics_mode: 'optional', gpc_applied: false }, share: { workspace_id: 'workspace-1' } } as never)
    const { admin, update, eq, is, select, eventInsert } = createAdminMock({ id: sessionId, share_id: shareId, confirmed_at: '2026-09-22T00:00:00.000Z' })
    getAdmin.mockReturnValue(admin as never)

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ confirmed: true })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      confirmed_at: expect.any(String),
      last_seen_at: expect.any(String),
    }))
    expect(eq).toHaveBeenNthCalledWith(1, 'id', sessionId)
    expect(eq).toHaveBeenNthCalledWith(2, 'share_id', shareId)
    expect(is).toHaveBeenCalledWith('confirmed_at', null)
    expect(select).toHaveBeenCalledWith('id, share_id, confirmed_at')
    expect(recordViewEvent).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1',
      shareId,
      sessionId,
      eventType: 'view_confirmed',
    }))
    expect(eventInsert).not.toHaveBeenCalled()
    expect(notifyViewer).toHaveBeenCalledWith(expect.objectContaining({ shareId, sessionId }))
  })

  it('keeps viewer confirmation successful when SMTP notification fails', async () => {
    requireSession.mockResolvedValue({ session: { id: sessionId }, share: { workspace_id: 'workspace-1' } } as never)
    notifyViewer.mockRejectedValue(new Error('SMTP provider unavailable'))
    const { admin } = createAdminMock({ id: sessionId, share_id: shareId, confirmed_at: '2026-09-22T00:00:00.000Z' })
    getAdmin.mockReturnValue(admin as never)

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ confirmed: true })
  })

  it('treats an already-confirmed session as an idempotent no-op', async () => {
    requireSession.mockResolvedValue({ session: { id: sessionId }, share: { workspace_id: 'workspace-1' } } as never)
    const { admin, eventInsert } = createAdminMock(null)
    getAdmin.mockReturnValue(admin as never)

    const response = await POST(request({ shareId }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ confirmed: false })
    expect(eventInsert).not.toHaveBeenCalled()
    expect(notifyViewer).not.toHaveBeenCalled()
  })
})
