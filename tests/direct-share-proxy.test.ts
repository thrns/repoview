import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/shares/exchange', async () => {
  const actual = await vi.importActual<typeof import('../lib/shares/exchange')>('../lib/shares/exchange')
  return { ...actual, exchangeShareToken: vi.fn() }
})
vi.mock('../lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  getPublicShareRateLimitKey: vi.fn(() => 'share-token-hash'),
  rateLimitResponse: vi.fn(() => new Response(null, { status: 429 })),
  rateLimitUnavailableResponse: vi.fn(() => new Response(null, { status: 503 })),
}))
vi.mock('../lib/security/csp', () => ({ createContentSecurityPolicy: vi.fn(() => 'test-csp') }))
vi.mock('../lib/supabase/proxy', () => ({ updateSupabaseSession: vi.fn() }))
vi.mock('../lib/viewer/diagnostics', () => ({ logViewerDiagnostic: vi.fn(), summarizeViewerError: vi.fn(() => ({ message: 'failed' })) }))

import { NextRequest } from 'next/server'

import { proxy } from '../proxy'
import { exchangeShareToken, getViewerSessionCookieName, LEGACY_VIEWER_SESSION_COOKIE, ShareExchangeError } from '../lib/shares/exchange'
import { checkPublicRateLimit } from '../lib/security/rate-limit'

const exchange = vi.mocked(exchangeShareToken)
const checkLimit = vi.mocked(checkPublicRateLimit)

beforeEach(() => {
  vi.clearAllMocks()
  exchange.mockResolvedValue({
    shareId: '22222222-2222-4222-8222-222222222222',
    shareCode: 'aB3xK9pQ2',
    rawSessionToken: 'session-token',
    expiresAt: null,
  })
})

describe('direct new share access through proxy', () => {
  it('initializes the viewer session without redirecting away from the public URL', async () => {
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2')

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('set-cookie')).toContain(`${getViewerSessionCookieName('aB3xK9pQ2')}=session-token`)
    expect(exchange).toHaveBeenCalledWith('aB3xK9pQ2', expect.any(Object), undefined, { analyticsMode: 'necessary', gpc: false })
  })

  it('creates a fresh visit session for a new direct top-level navigation', async () => {
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2', {
      headers: { cookie: `${getViewerSessionCookieName('aB3xK9pQ2')}=session-token` },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(exchange).toHaveBeenCalledWith('aB3xK9pQ2', expect.any(Object), undefined, { analyticsMode: 'necessary', gpc: false })
  })

  it('does not create a second session after the legacy token redirect', async () => {
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2', {
      headers: { cookie: `${LEGACY_VIEWER_SESSION_COOKIE}=session-token; repoview_share_redirect=aB3xK9pQ2` },
    })

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(exchange).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toContain('repoview_share_redirect=')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('does not create a visit session for a prefetch request', async () => {
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2', {
      headers: { purpose: 'prefetch' },
    })

    const response = await proxy(request)

    expect(response.status).toBe(204)
    expect(exchange).not.toHaveBeenCalled()
  })

  it('preserves safe error behavior for revoked direct codes', async () => {
    exchange.mockRejectedValueOnce(new ShareExchangeError('revoked'))
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2')

    const response = await proxy(request)

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://repoview.test/view/error?reason=revoked')
    expect(response.headers.get('set-cookie')).toContain(`${getViewerSessionCookieName('aB3xK9pQ2')}=`)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(response.headers.get('set-cookie')).not.toContain(`${getViewerSessionCookieName('otherShare')}=`)
  })

  it('does not treat malformed paths as new share capabilities', async () => {
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2-')

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(exchange).not.toHaveBeenCalled()
  })

  it('rate-limits direct code opens before attempting exchange', async () => {
    checkLimit.mockResolvedValueOnce({ allowed: false, limit: 60, remaining: 0, retryAfterSeconds: 9, resetAt: '2026-09-29T01:00:09.000Z' })
    const request = new NextRequest('https://repoview.test/view/aB3xK9pQ2')

    const response = await proxy(request)

    expect(response.status).toBe(429)
    expect(exchange).not.toHaveBeenCalled()
  })
})
