import { describe, expect, it } from 'vitest'

import { getPublicEnv, parsePublicEnv } from '../lib/env/public'
import { parseServerEnv } from '../lib/env/schema'

const serverFixture = {
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  GITHUB_APP_ID: '1234',
  GITHUB_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nprivate\\n-----END PRIVATE KEY-----',
  SHARE_TOKEN_PEPPER: 's'.repeat(32),
  SESSION_TOKEN_PEPPER: 't'.repeat(32),
  IP_HASH_SALT: 'i'.repeat(32),
  SMTP_USER: 'owner@example.com',
  SMTP_APP_PASSWORD: 'app-password',
  NOTIFICATION_TO_EMAIL: 'owner@example.com',
}

describe('environment validation', () => {
  it('validates and normalizes public configuration', () => {
    expect(parsePublicEnv({
      NEXT_PUBLIC_APP_URL: 'https://code.thrn.im',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    })).toEqual({
      NEXT_PUBLIC_APP_URL: 'https://code.thrn.im',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    })
  })

  it('reads browser-safe public variables through static environment references', () => {
    const environment = process.env as Record<string, string | undefined>
    const keys = ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
    const previous = Object.fromEntries(keys.map((key) => [key, environment[key]]))

    try {
      environment.NEXT_PUBLIC_APP_URL = 'https://code.thrn.im'
      environment.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key'
      expect(getPublicEnv()).toEqual({
        NEXT_PUBLIC_APP_URL: 'https://code.thrn.im',
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      })
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete environment[key]
        else environment[key] = previous[key]
      }
    }
  })

  it('normalizes escaped GitHub private-key newlines and applies defaults', () => {
    const result = parseServerEnv(serverFixture)
    expect(result.GITHUB_APP_ID).toBe(1234)
    expect(result.GITHUB_APP_PRIVATE_KEY).toContain('\nprivate\n')
    expect(result.SMTP_HOST).toBe('smtp.gmail.com')
    expect(result.SMTP_PORT).toBe(465)
    expect(result.SMTP_FROM_NAME).toBe('RepoView')
  })

  it('does not treat a GitHub installation ID as runtime environment configuration', () => {
    const result = parseServerEnv({ ...serverFixture, GITHUB_APP_INSTALLATION_ID: '5678' })
    expect(result).not.toHaveProperty('GITHUB_APP_INSTALLATION_ID')
  })

  it('reports missing required server configuration clearly', () => {
    expect(() => parseServerEnv({})).toThrow(/Invalid server environment/)
  })
})
