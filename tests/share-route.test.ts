import { describe, expect, it, vi } from 'vitest'

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

const exchange = vi.mocked(exchangeShareToken)

describe('share entry route', () => {
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
