import { describe, expect, it } from 'vitest'

import { hasSupabaseAuthCookie } from '@/lib/auth/supabase-session-cookie'

describe('hasSupabaseAuthCookie', () => {
  it('recognizes the default Supabase SSR session cookie and chunked cookies', () => {
    expect(hasSupabaseAuthCookie([
      { name: 'sb-projectref-auth-token' },
      { name: 'sb-anotherproject-auth-token.0' },
    ])).toBe(true)
  })

  it('ignores unrelated cookies, including the active workspace cookie', () => {
    expect(hasSupabaseAuthCookie([
      { name: 'repoview-active-workspace' },
      { name: 'sb-projectref-auth-token-code-verifier' },
      { name: 'theme' },
    ])).toBe(false)
  })
})
