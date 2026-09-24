import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  getPublicShareRateLimitKey: vi.fn(() => 'share-token'),
  rateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'retry-after': '9' } })),
  rateLimitUnavailableResponse: vi.fn(() => new Response(null, { status: 503 })),
}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/shares/link-open-metadata', () => ({
  getLinkOpenMetadata: vi.fn(() => ({})),
}))
vi.mock('@/lib/shares/exchange', () => ({
  exchangeShareToken: vi.fn(),
  ShareExchangeError: class ShareExchangeError extends Error {},
  VIEWER_SESSION_COOKIE: 'repoview_viewer_session',
}))

import { GET } from '../app/s/[token]/route'
import { exchangeShareToken } from '@/lib/shares/exchange'
import { checkPublicRateLimit } from '../lib/security/rate-limit'

const exchange = vi.mocked(exchangeShareToken)
const checkLimit = vi.mocked(checkPublicRateLimit)

describe('share entry route', () => {
  it('returns a 429 with Retry-After before exchanging an over-limit share request', async () => {
    checkLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      remaining: 0,
      retryAfterSeconds: 9,
      resetAt: '2026-09-24T12:00:09.000Z',
    })

    const response = await GET(
      new Request('https://repoview.test/s/long-secret-token') as never,
      { params: Promise.resolve({ token: 'long-secret-token' }) },
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('9')
    expect(exchange).not.toHaveBeenCalled()
  })

  it('redirects to the short viewer URL and keeps the session available to APIs', async () => {
    exchange.mockResolvedValue({
      shareId: '22222222-2222-4222-8222-222222222222',
      shareCode: 'Ab3k9Qx2',
      rawSessionToken: 'session-token',
      expiresAt: null,
    })

    const response = await GET(
      new Request('https://repoview.test/s/long-secret-token') as never,
      { params: Promise.resolve({ token: 'long-secret-token' }) },
    )

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://repoview.test/view/Ab3k9Qx2')
    expect(response.headers.get('set-cookie')).toContain('Path=/')
  })
})
