import { generateKeyPairSync } from 'node:crypto'

import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import {
  GITHUB_API_VERSION,
  GITHUB_COMMON_HEADERS,
  getGitHubInstallationAuthentication,
  getGitHubInstallationIdForRepository,
} from '../lib/github/client'
import { createSupabaseAdminClient } from '../lib/supabase/admin'

const originalEnvironment = { ...process.env }
const originalFetch = globalThis.fetch
const getAdmin = vi.mocked(createSupabaseAdminClient)

describe('GitHub App authentication', () => {
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

    Object.assign(process.env, {
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      GITHUB_APP_ID: '1234',
      GITHUB_APP_SLUG: 'repoview',
      GITHUB_APP_CLIENT_ID: 'Iv1.test-client-id',
      GITHUB_APP_CLIENT_SECRET: 'client-secret',
      GITHUB_APP_PRIVATE_KEY: privateKeyPem,
      GITHUB_WEBHOOK_SECRET: 'w'.repeat(32),
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

    const authentication = await getGitHubInstallationAuthentication(5678)

    expect(authentication.type).toBe('token')
    expect(authentication.token).toBe('installation-token')
    expect(authentication.installationId).toBe(5678)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves a repository installation only inside the requested workspace', async () => {
    const repositoryQuery = createQuery({
      data: {
        workspace_id: 'workspace-a',
        github_installation_id: 'installation-a',
      },
      error: null,
    })
    const installationQuery = createQuery({
      data: {
        github_installation_id: 5678,
        status: 'active',
      },
      error: null,
    })
    getAdmin.mockReturnValue({
      from(table: string) {
        return table === 'repositories' ? repositoryQuery : installationQuery
      },
    } as never)

    await expect(getGitHubInstallationIdForRepository('repository-a', 'workspace-a')).resolves.toBe(5678)
    expect(repositoryQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-a')
    expect(installationQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-a')
    expect(installationQuery.eq).toHaveBeenCalledWith('status', 'active')
  })
})

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}
