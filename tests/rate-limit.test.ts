import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/env/server', () => ({
  getRateLimitEnv: vi.fn(() => ({ IP_HASH_SALT: 'i'.repeat(32) })),
  getServerEnv: vi.fn(() => ({ SHARE_TOKEN_PEPPER: 's'.repeat(32) })),
}))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import {
  checkPublicRateLimit,
  checkRateLimits,
  getPublicShareRateLimitKey,
  hashRateLimitKey,
  RATE_LIMIT_POLICIES,
  rateLimitResponse,
} from '../lib/security/rate-limit'

const getAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VERCEL', '1')
  vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'unavailable')
})

afterEach(() => vi.unstubAllEnvs())

describe('application rate limiting', () => {
  it('uses hashed, scope-separated keys and returns the database decision', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: true, remaining: 19, retry_after_seconds: 300, reset_at: '2026-09-24T12:05:00.000Z' }],
      error: null,
    })
    getAdmin.mockReturnValue({ rpc } as never)

    const result = await checkRateLimits('authenticated-share-create', [{ value: 'workspace:workspace-1' }])

    expect(result).toBeNull()
    expect(rpc).toHaveBeenCalledWith('consume_rate_limit', expect.objectContaining({
      target_limit: RATE_LIMIT_POLICIES['authenticated-share-create'].limit,
      target_window_seconds: RATE_LIMIT_POLICIES['authenticated-share-create'].windowSeconds,
      target_key_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }))
    const call = rpc.mock.calls[0][1] as { target_key_hash: string }
    expect(call.target_key_hash).not.toContain('workspace-1')
    expect(hashRateLimitKey('workspace-1')).not.toBe(call.target_key_hash)
  })

  it('denies the request when any context bucket is exhausted', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: [{ allowed: true, remaining: 10, retry_after_seconds: 60, reset_at: '2026-09-24T12:01:00.000Z' }], error: null })
      .mockResolvedValueOnce({ data: [{ allowed: false, remaining: 0, retry_after_seconds: 42, reset_at: '2026-09-24T12:00:42.000Z' }], error: null })
    getAdmin.mockReturnValue({ rpc } as never)

    await expect(checkRateLimits('public-download', [
      { value: 'session:session-1' },
      { value: 'ip:203.0.113.10' },
    ])).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 42 })
  })

  it('includes Retry-After and standard rate-limit headers on 429 responses', async () => {
    const response = rateLimitResponse({
      allowed: false,
      limit: 20,
      remaining: 0,
      retryAfterSeconds: 17,
      resetAt: '2026-09-24T12:00:17.000Z',
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('17')
    expect(response.headers.get('x-ratelimit-limit')).toBe('20')
    await expect(response.json()).resolves.toEqual({ error: 'rate_limited', retryAfterSeconds: 17 })
  })

  it('uses an IP and optional share context for public requests', async () => {
    vi.stubEnv('REPOVIEW_TRUSTED_SOURCE_IP_MODE', 'vercel')
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, remaining: 59, retry_after_seconds: 60, reset_at: '2026-09-24T12:01:00.000Z' }], error: null })
    getAdmin.mockReturnValue({ rpc } as never)

    await checkPublicRateLimit(new Request('https://repoview.test/s/token', { headers: { 'x-vercel-forwarded-for': '203.0.113.10' } }), 'public-share-open', ['share-token:token-hash'])

    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('does not create a global ip:unknown bucket when source IP is unavailable', async () => {
    const rpc = vi.fn()
    getAdmin.mockReturnValue({ rpc } as never)

    const response = await checkPublicRateLimit(new Request('https://repoview.test/s/token', {
      headers: {
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '198.51.100.1',
        'x-vercel-forwarded-for': '203.0.113.1',
      },
    }), 'public-share-open')

    expect(response).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('keeps session-specific limiting available without a trusted IP', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, remaining: 119, retry_after_seconds: 60, reset_at: '2026-09-24T12:01:00.000Z' }], error: null })
    getAdmin.mockReturnValue({ rpc } as never)

    await checkPublicRateLimit(new Request('https://repoview.test/api/view/heartbeat'), 'public-viewer-heartbeat', ['session:session-1'])

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0][1]).toMatchObject({ target_scope: 'public-viewer-heartbeat' })
    expect((rpc.mock.calls[0][1] as { target_key_hash: string }).target_key_hash).toBe(hashRateLimitKey('public-viewer-heartbeat:session:session-1'))
  })

  it('uses a non-reversible capability identifier for pre-authorization share limits', async () => {
    const rawCapability = 'raw-share-capability-token'
    const capabilityKey = getPublicShareRateLimitKey(rawCapability)
    const rpc = vi.fn().mockResolvedValue({ data: [{ allowed: true, remaining: 59, retry_after_seconds: 60, reset_at: '2026-09-24T12:01:00.000Z' }], error: null })
    getAdmin.mockReturnValue({ rpc } as never)

    await checkPublicRateLimit(new Request('https://repoview.test/s/token'), 'public-share-open', [capabilityKey])

    const storedKey = (rpc.mock.calls[0][1] as { target_key_hash: string }).target_key_hash
    expect(capabilityKey).not.toContain(rawCapability)
    expect(storedKey).toMatch(/^[a-f0-9]{64}$/)
    expect(storedKey).not.toContain(rawCapability)
    expect(storedKey).not.toContain(capabilityKey)
  })
})
