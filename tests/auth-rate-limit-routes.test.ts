import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  rateLimitResponse: vi.fn((decision: { retryAfterSeconds: number }) => new Response(null, { status: 429, headers: { 'retry-after': String(decision.retryAfterSeconds) } })),
  rateLimitUnavailableResponse: vi.fn(() => new Response(null, { status: 503 })),
}))
vi.mock('../lib/env/public', () => ({ getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'https://repoview.test' })) }))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

import { POST as login } from '../app/api/auth/login/route'
import { POST as signup } from '../app/api/auth/signup/route'
import { POST as passwordReset } from '../app/api/auth/password-reset/route'
import { checkPublicRateLimit } from '../lib/security/rate-limit'
import { createSupabaseServerClient } from '../lib/supabase/server'

const checkLimit = vi.mocked(checkPublicRateLimit)
const getSupabase = vi.mocked(createSupabaseServerClient)

function request(body: unknown) {
  return new Request('https://repoview.test/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.20' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  getSupabase.mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  } as never)
})

describe('auth route rate limiting', () => {
  it('returns 429 before attempting password sign-in', async () => {
    checkLimit.mockResolvedValueOnce({ allowed: false, limit: 10, remaining: 0, retryAfterSeconds: 31, resetAt: '2026-09-24T12:00:31.000Z' })

    const response = await login(request({ email: 'owner@example.com', password: 'password' }))

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('31')
    expect(getSupabase).not.toHaveBeenCalled()
  })

  it('rate-limits signup and password reset through the app boundary', async () => {
    await expect(signup(request({ fullName: 'Ada Lovelace', email: 'ada@example.com', password: 'password' }))).resolves.toMatchObject({ status: 200 })
    await expect(passwordReset(request({ email: 'ada@example.com' }))).resolves.toMatchObject({ status: 200 })
    expect(checkLimit).toHaveBeenCalledWith(expect.any(Request), 'auth-signup', ['email:ada@example.com'])
    expect(checkLimit).toHaveBeenCalledWith(expect.any(Request), 'auth-password-reset', ['email:ada@example.com'])
  })
})
