import { generateKeyPairSync } from 'node:crypto'

import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import {
  GITHUB_API_VERSION,
  GITHUB_COMMON_HEADERS,
  getGitHubInstallationAuthenticationForInstallation,
  getGitHubInstallationClientForInstallation,
  getGitHubInstallationClientForRepository,
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
    const installationQuery = createQuery({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        workspace_id: '22222222-2222-4222-8222-222222222222',
        github_installation_id: 5678,
        status: 'active',
      },
      error: null,
    })
    getAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue(installationQuery),
    } as never)
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

    const authentication = await getGitHubInstallationAuthenticationForInstallation(
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    )

    expect(authentication.type).toBe('token')
    expect(authentication.token).toBe('installation-token')
    expect(authentication.installationId).toBe(5678)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves a repository installation only inside the requested workspace', async () => {
    const installationQuery = createQuery({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        workspace_id: '33333333-3333-4333-8333-333333333333',
        github_installation_id: 5678,
        status: 'active',
      },
      error: null,
    })
    getAdmin.mockReturnValue({
      from: vi.fn().mockReturnValue(installationQuery),
    } as never)

    await expect(getGitHubInstallationClientForInstallation(
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
    )).resolves.toBeDefined()
    expect(installationQuery.eq).toHaveBeenCalledWith('workspace_id', '33333333-3333-4333-8333-333333333333')
    expect(installationQuery.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('does not instantiate a client for an installation record from another workspace', async () => {
    const repositoryQuery = createQuery({
      data: {
        workspace_id: '33333333-3333-4333-8333-333333333333',
        github_installation_id: '11111111-1111-4111-8111-111111111111',
      },
      error: null,
    })
    const installationQuery = createQuery({ data: null, error: null })
    getAdmin.mockReturnValue({
      from(table: string) {
        return table === 'repositories' ? repositoryQuery : installationQuery
      },
    } as never)

    await expect(getGitHubInstallationClientForRepository(
      '55555555-5555-4555-8555-555555555555',
      '44444444-4444-4444-8444-444444444444',
    )).rejects.toThrow('unavailable for this workspace')
    expect(repositoryQuery.eq).toHaveBeenCalledWith('workspace_id', '44444444-4444-4444-8444-444444444444')
    expect(installationQuery.eq).toHaveBeenCalledWith('workspace_id', '44444444-4444-4444-8444-444444444444')
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
