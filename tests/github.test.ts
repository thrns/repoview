import { generateKeyPairSync } from 'node:crypto'

import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  GITHUB_API_VERSION,
  GITHUB_COMMON_HEADERS,
  getGitHubInstallationAuthentication,
} from '../lib/github/client'

const originalEnvironment = { ...process.env }
const originalFetch = globalThis.fetch

describe('GitHub App authentication', () => {
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

    Object.assign(process.env, {
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      GITHUB_APP_ID: '1234',
      GITHUB_APP_INSTALLATION_ID: '5678',
      GITHUB_APP_PRIVATE_KEY: privateKeyPem,
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
    globalThis.fetch = originalFetch
  })

  it('centralizes the documented GitHub REST headers', () => {
    expect(GITHUB_API_VERSION).toBe('2022-11-28')
    expect(GITHUB_COMMON_HEADERS).toMatchObject({
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    })
  })

  it('mints an installation token through the GitHub App endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.github.com/app/installations/5678/access_tokens')
      expect(init?.method).toBe('POST')
      expect(init?.headers).toBeTruthy()

      return new Response(JSON.stringify({
        token: 'installation-token',
        expires_at: '2026-09-21T21:45:00Z',
        permissions: { metadata: 'read' },
        repository_selection: 'selected',
      }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    })

    globalThis.fetch = fetchMock

    const authentication = await getGitHubInstallationAuthentication()

    expect(authentication.type).toBe('token')
    expect(authentication.token).toBe('installation-token')
    expect(authentication.installationId).toBe(5678)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
