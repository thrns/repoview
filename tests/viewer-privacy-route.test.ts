import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('../lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({ checkPublicRateLimit: vi.fn(async () => null), checkRateLimits: vi.fn(async () => null), getRequestIp: vi.fn(() => null), rateLimitResponse: vi.fn(), rateLimitUnavailableResponse: vi.fn() }))
vi.mock('@/lib/auth/viewer-session', () => ({ requireViewerSession: vi.fn() }))
vi.mock('../lib/analytics/identity', () => ({ findOrCreateViewer: vi.fn() }))
vi.mock('@/lib/analytics/identity', () => ({ findOrCreateViewer: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/security/tokens', () => ({
  generateViewerPrivacyPreferenceToken: vi.fn(() => 'preference-token-12345678901234567890'),
  hashViewerPrivacyPreference: vi.fn(() => 'preference-hash'),
}))

import { cookies } from 'next/headers'
import { POST } from '../app/api/view/privacy/route'
import { findOrCreateViewer } from '../lib/analytics/identity'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { createSupabaseAdminClient } from '../lib/supabase/admin'

const getCookies = vi.mocked(cookies)
const requireSession = vi.mocked(requireViewerSession)
const getViewer = vi.mocked(findOrCreateViewer)
const getAdmin = vi.mocked(createSupabaseAdminClient)

const shareId = '22222222-2222-4222-8222-222222222222'

function request(mode: 'necessary' | 'optional', headers: HeadersInit = {}) {
  return new Request('https://repoview.test/api/view/privacy', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ shareId, analyticsMode: mode }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  const update = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const upsert = vi.fn().mockReturnThis()
  getAdmin.mockReturnValue({
    from(table: string) {
      return table === 'viewer_privacy_preferences' ? { upsert } : { update, eq }
    },
  } as never)
  getCookies.mockResolvedValue({
    get: vi.fn((name: string) => name === 'repoview_viewer_id' ? { value: 'viewer-token-12345678901234567890' } : undefined),
  } as never)
  requireSession.mockResolvedValue({
    session: { id: 'session-1', analytics_mode: 'necessary', gpc_applied: false },
    share: { id: shareId, workspace_id: 'workspace-1' },
  } as never)
  getViewer.mockResolvedValue({ viewer: { id: 'viewer-1' } } as never)
})

describe('viewer privacy route', () => {
  it('creates the optional identity only after an explicit opt-in', async () => {
    const response = await POST(request('optional'))

    expect(response.status).toBe(200)
    expect(getViewer).toHaveBeenCalledWith('viewer-token-12345678901234567890', 'workspace-1')
    expect(response.headers.get('set-cookie')).toContain('repoview_viewer_privacy=')
    expect(response.headers.get('set-cookie')).toContain('repoview_viewer_id=')
  })

  it('keeps GPC requests in necessary-only mode', async () => {
    const response = await POST(request('optional', { 'sec-gpc': '1' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ analyticsMode: 'necessary', gpc: true, optionalAvailable: false })
    expect(getViewer).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
