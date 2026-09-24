import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  generateShareCode,
  generateShareToken,
  generateViewerSessionToken,
  hashShareToken,
  hashToken,
  hashViewerSessionToken,
  TOKEN_BYTES,
  SHARE_CODE_BYTES,
  verifyTokenHash,
} from '../lib/security/tokens'

const originalEnvironment = { ...process.env }

describe('secure token utilities', () => {
  beforeAll(() => {
    Object.assign(process.env, {
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      GITHUB_APP_ID: '1234',
      GITHUB_APP_PRIVATE_KEY: 'private-key',
      SHARE_TOKEN_PEPPER: 's'.repeat(32),
      SESSION_TOKEN_PEPPER: 't'.repeat(32),
      IP_HASH_SALT: 'i'.repeat(32),
      SMTP_USER: 'owner@example.com',
      SMTP_APP_PASSWORD: 'app-password',
      NOTIFICATION_TO_EMAIL: 'owner@example.com',
    })
  })

  afterAll(() => {
    process.env = originalEnvironment
  })

  it('generates independent URL-safe tokens with at least 32 random bytes', () => {
    const shareToken = generateShareToken()
    const sessionToken = generateViewerSessionToken()

    expect(Buffer.from(shareToken, 'base64url')).toHaveLength(TOKEN_BYTES)
    expect(Buffer.from(sessionToken, 'base64url')).toHaveLength(TOKEN_BYTES)
    expect(shareToken).not.toBe(sessionToken)
    expect(shareToken).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates an 8-character URL-safe public share code', () => {
    const shareCode = generateShareCode()

    expect(Buffer.from(shareCode, 'base64url')).toHaveLength(SHARE_CODE_BYTES)
    expect(shareCode).toHaveLength(8)
    expect(shareCode).toMatch(/^[A-Za-z0-9_-]{8}$/)
  })

  it('hashes deterministically with separate token-type peppers', () => {
    const rawToken = 'same-raw-token'
    const shareHash = hashShareToken(rawToken)
    const sessionHash = hashViewerSessionToken(rawToken)

    expect(shareHash).toBe(hashShareToken(rawToken))
    expect(shareHash).toMatch(/^[a-f0-9]{64}$/)
    expect(sessionHash).toMatch(/^[a-f0-9]{64}$/)
    expect(shareHash).not.toBe(sessionHash)
    expect(hashToken(rawToken, 'pepper-a')).not.toBe(hashToken(rawToken, 'pepper-b'))
  })

  it('verifies hashes with constant-time comparison and rejects malformed values', () => {
    const rawToken = 'viewer-token'
    const pepper = 'pepper'
    const hash = hashToken(rawToken, pepper)

    expect(verifyTokenHash(rawToken, hash, pepper)).toBe(true)
    expect(verifyTokenHash('different-token', hash, pepper)).toBe(false)
    expect(verifyTokenHash(rawToken, 'not-a-hash', pepper)).toBe(false)
  })
})
