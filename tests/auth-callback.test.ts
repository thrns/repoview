import { describe, expect, it } from 'vitest'

import { getAuthCallbackRedirectPath } from '../lib/auth/redirect'

describe('auth callback redirect validation', () => {
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/%5Cevil.com',
    '%2F%2Fevil.com',
    '%252F%252Fevil.com',
    '/dashboard/settings',
    '/dashboard?from=oauth',
  ])('rejects unsafe or non-allowlisted destination %s', (value) => {
    expect(getAuthCallbackRedirectPath(value)).toBe('/dashboard')
  })

  it.each(['/dashboard', '/onboarding', '/login'])('allows the exact internal route %s', (value) => {
    expect(getAuthCallbackRedirectPath(value)).toBe(value)
  })

  it('rejects encoded external destinations after query-string decoding', () => {
    const requestUrl = new URL('https://repoview.test/auth/callback?next=%2F%5Cevil.com')
    expect(getAuthCallbackRedirectPath(requestUrl.searchParams.get('next'))).toBe('/dashboard')
  })
})
