import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireWorkspaceAdmin: vi.fn(),
}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))
vi.mock('../lib/github/client', async () => {
  const actual = await vi.importActual<typeof import('../lib/github/client')>('../lib/github/client')
  return {
    ...actual,
    getGitHubAppInstallation: vi.fn(),
  }
})
vi.mock('../lib/github/installations', () => ({
  registerVerifiedGitHubInstallation: vi.fn(),
}))
vi.mock('../lib/github/repositories', () => ({
  listInstallationRepositories: vi.fn(),
}))

import { requireWorkspaceAdmin } from '../lib/auth/workspace'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { getGitHubAppInstallation } from '../lib/github/client'
import { registerVerifiedGitHubInstallation } from '../lib/github/installations'
import { listInstallationRepositories } from '../lib/github/repositories'
import {
  beginGitHubAuthorization,
  completeGitHubConnection,
  createCodeChallenge,
} from '../lib/github/connection-flow'

const getContext = vi.mocked(requireWorkspaceAdmin)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const getAppInstallation = vi.mocked(getGitHubAppInstallation)
const registerInstallation = vi.mocked(registerVerifiedGitHubInstallation)
const listRepositories = vi.mocked(listInstallationRepositories)
const originalFetch = globalThis.fetch

beforeAll(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APP_URL: 'https://repoview.example',
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    GITHUB_APP_ID: '1234',
    GITHUB_APP_SLUG: 'repoview',
    GITHUB_APP_CLIENT_ID: 'Iv1.client-id',
    GITHUB_APP_CLIENT_SECRET: 'client-secret',
    GITHUB_APP_PRIVATE_KEY: 'private-key',
    GITHUB_WEBHOOK_SECRET: 'w'.repeat(32),
    SHARE_TOKEN_PEPPER: 's'.repeat(32),
    SESSION_TOKEN_PEPPER: 't'.repeat(32),
    IP_HASH_SALT: 'i'.repeat(32),
    SMTP_USER: 'owner@example.com',
    SMTP_APP_PASSWORD: 'app-password',
  })
})

beforeEach(() => {
  getContext.mockResolvedValue({
    user: { id: 'user-1' },
    workspace: { id: 'workspace-1' },
    membership: { role: 'owner' },
  } as never)
  getAdmin.mockReturnValue({ rpc: vi.fn() } as never)
  getAppInstallation.mockReset()
  registerInstallation.mockReset()
  listRepositories.mockReset()
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

describe('GitHub App connection flow', () => {
  it('creates the RFC 7636 S256 challenge without exposing the verifier', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    expect(createCodeChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('binds the authorization exchange to the RepoView user and uses PKCE', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ workspace_id: 'workspace-1', code_verifier: 'a'.repeat(43) }],
      error: null,
    })
    getAdmin.mockReturnValue({ rpc } as never)

    const url = await beginGitHubAuthorization('s'.repeat(43), 777)
    const authorizationUrl = new URL(url)

    expect(rpc).toHaveBeenCalledWith('claim_github_connection_installation', {
      target_state_hash: expect.any(String),
      target_user_id: 'user-1',
      target_installation_id: 777,
    })
    expect(authorizationUrl.searchParams.get('client_id')).toBe('Iv1.client-id')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authorizationUrl.searchParams.get('code_verifier')).toBeNull()
  })

  it('does not attach an installation that the authenticated GitHub user cannot see', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ workspace_id: 'workspace-1', claimed_installation_id: 777, code_verifier: 'a'.repeat(43) }],
      error: null,
    })
    getAdmin.mockReturnValue({ rpc } as never)
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/login/oauth/access_token')) return jsonResponse({ access_token: 'short-lived-user-token' })
      if (url.endsWith('/user')) return jsonResponse({ id: 42 })
      return jsonResponse({ installations: [{ id: 888, app_id: 1234, account: { id: 42, login: 'octocat', type: 'User' } }] })
    })

    await expect(completeGitHubConnection('s'.repeat(43), 'oauth-code')).resolves.toEqual({ status: 'pending', returnPath: '/dashboard/settings' })
    expect(getAppInstallation).not.toHaveBeenCalled()
    expect(registerInstallation).not.toHaveBeenCalled()
  })

  it('verifies the user-visible installation before saving metadata and fetching repositories', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ workspace_id: 'workspace-1', claimed_installation_id: 777, code_verifier: 'a'.repeat(43) }],
      error: null,
    })
    getAdmin.mockReturnValue({ rpc } as never)
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/login/oauth/access_token')) return jsonResponse({ access_token: 'short-lived-user-token' })
      if (url.endsWith('/user')) return jsonResponse({ id: 42 })
      return jsonResponse({ installations: [{ id: 777, app_id: 1234, account: { id: 9001, login: 'acme', type: 'Organization' } }] })
    })
    getAppInstallation.mockResolvedValue({
      id: 777,
      app_id: 1234,
      account: { id: 9001, login: 'acme', type: 'Organization' },
      repository_selection: 'selected',
      permissions: { contents: 'read' },
      suspended_at: null,
    } as never)
    registerInstallation.mockResolvedValue({ id: 'installation-record-1' } as never)
    listRepositories.mockResolvedValue([{ githubRepositoryId: 1 }] as never)

    await expect(completeGitHubConnection('s'.repeat(43), 'oauth-code')).resolves.toEqual({
      status: 'success',
      repositoryCount: 1,
      returnPath: '/dashboard/settings',
    })
    expect(registerInstallation).toHaveBeenCalledWith('workspace-1', expect.objectContaining({ id: 777, app_id: 1234 }))
    expect(listRepositories).toHaveBeenCalledWith(777, 'installation-record-1')
  })
})

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
}
