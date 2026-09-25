import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('@/lib/shares/exchange', async () => vi.importActual('../lib/shares/exchange'))
vi.mock('@/lib/auth/viewer-access', async () => vi.importActual('../lib/auth/viewer-access'))
vi.mock('@/lib/viewer/privacy-shared', async () => vi.importActual('../lib/viewer/privacy-shared'))
vi.mock('../lib/security/rate-limit', () => ({
  checkPublicRateLimit: vi.fn(async () => null),
  getPublicShareRateLimitKey: vi.fn(() => 'share-token'),
  rateLimitResponse: vi.fn(),
  rateLimitUnavailableResponse: vi.fn(),
}))
vi.mock('@/lib/shares/link-open-metadata', () => ({
  getLinkOpenMetadata: vi.fn(() => ({})),
}))
vi.mock('../lib/analytics/identity', () => ({ findOrCreateViewer: vi.fn() }))
vi.mock('../lib/viewer/view-events', () => ({ recordViewerViewEvent: vi.fn().mockResolvedValue({ recorded: true }) }))
vi.mock('../lib/github/client', () => ({ listWorkspaceGitHubInstallations: vi.fn() }))
vi.mock('../lib/github/repositories', () => ({ getRepositoryMetadataById: vi.fn() }))
vi.mock('../lib/viewer/tree-loader', () => ({
  loadAuthorizedViewerTree: vi.fn(async () => ({ status: 'ready', nodes: [] })),
}))
vi.mock('../lib/viewer/root-loader', () => ({
  loadAuthorizedViewerRoot: vi.fn(async () => ({ status: 'ready', readme: null })),
}))

import { cookies, headers } from 'next/headers'

import { GET } from '../app/s/[token]/route'
import { getViewerPageData } from '../lib/viewer/page-data'
import { VIEWER_SESSION_COOKIE } from '../lib/shares/exchange'
import { hashViewerSessionToken } from '../lib/security/tokens'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { listWorkspaceGitHubInstallations } from '../lib/github/client'
import { getRepositoryMetadataById } from '../lib/github/repositories'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const getCookies = vi.mocked(cookies)
const getHeaders = vi.mocked(headers)
const listInstallations = vi.mocked(listWorkspaceGitHubInstallations)
const getMetadata = vi.mocked(getRepositoryMetadataById)

const shareId = '22222222-2222-4222-8222-222222222222'
const workspaceId = '77777777-7777-4777-8777-777777777777'
const repositoryId = '11111111-1111-4111-8111-111111111111'
const sessionId = '33333333-3333-4333-8333-333333333333'
const installationId = '44444444-4444-4444-8444-444444444444'
const shareCode = 'Ab3k9Qx2'

beforeAll(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_APP_URL: 'https://repoview.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.test',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    GITHUB_APP_ID: '1234',
    GITHUB_APP_SLUG: 'repoview',
    GITHUB_APP_CLIENT_ID: 'Iv1.test-client-id',
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
  vi.clearAllMocks()
  getHeaders.mockResolvedValue({ get: vi.fn(() => null) } as never)
})

describe('public share to viewer flow', () => {
  it('exchanges the raw link, carries the session cookie, and renders authorized repository data by share code', async () => {
    const state = createFlowAdmin()
    getAdmin.mockReturnValue(state.admin as never)
    listInstallations.mockResolvedValue([state.installation] as never)
    getMetadata.mockResolvedValue(state.githubRepository as never)

    const exchangeResponse = await GET(
      new Request('https://repoview.test/s/raw-share-token') as never,
      { params: Promise.resolve({ token: 'raw-share-token' }) },
    )

    expect(exchangeResponse.status).toBe(303)
    expect(exchangeResponse.headers.get('location')).toBe(`https://repoview.test/view/${shareCode}`)

    const setCookie = exchangeResponse.headers.get('set-cookie') ?? ''
    const rawSessionToken = setCookie.match(new RegExp(`${VIEWER_SESSION_COOKIE}=([^;]+)`))?.[1]
    expect(rawSessionToken).toBeTruthy()
    expect(state.sessionInsert).toHaveBeenCalledWith(expect.objectContaining({
      session_token_hash: hashViewerSessionToken(rawSessionToken ?? ''),
    }))

    getCookies.mockResolvedValue({
      get: (name: string) => name === VIEWER_SESSION_COOKIE ? { name, value: rawSessionToken } : undefined,
    } as never)

    const pageData = await getViewerPageData(shareCode)

    expect(pageData).toMatchObject({
      shareId: shareCode,
      internalShareId: shareId,
      repositoryOwner: 'octocat',
      repositorySlug: 'hello-world',
      refName: 'heads/main',
      root: { status: 'ready' },
      tree: { status: 'ready' },
    })
    expect(state.viewerSessionHashFilter).toBe(state.sessionInsert.mock.calls[0]?.[0]?.session_token_hash)
    expect(getMetadata).toHaveBeenCalledWith(42, installationId, workspaceId, 'system')
  })
})

function createFlowAdmin() {
  const share = {
    id: shareId,
    repository_id: repositoryId,
    workspace_id: workspaceId,
    share_code: shareCode,
    token_hash: 'share-hash',
    recipient_label: 'Interview',
    ref: 'heads/main',
    expires_at: null,
    revoked_at: null,
    notify_on_view: true,
    allow_download: false,
    rules: {},
    note: null,
    created_by: null,
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  }
  const repository = {
    id: repositoryId,
    workspace_id: workspaceId,
    github_installation_id: installationId,
    github_repository_id: 42,
    github_node_id: 'node-42',
    github_owner: 'octocat',
    github_repo: 'hello-world',
    default_branch: 'main',
    enabled: true,
    default_rules: {},
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  }
  const installation = {
    id: installationId,
    workspace_id: workspaceId,
    github_installation_id: 9001,
    github_account_id: 9002,
    github_account_login: 'octocat',
    github_account_type: 'User',
    repository_selection: 'selected',
    permissions: {},
    status: 'active',
  }
  const session = {
    id: sessionId,
    share_id: shareId,
    workspace_id: workspaceId,
    session_token_hash: 'set-after-exchange',
    analytics_mode: 'necessary',
    gpc_applied: false,
    first_seen_at: '2026-09-21T00:00:00.000Z',
    last_seen_at: '2026-09-21T00:00:00.000Z',
    confirmed_at: null,
    notified_at: null,
    viewer_id: null,
    user_agent: null,
    browser: null,
    os: null,
    device_type: null,
    country: null,
    region: null,
    city: null,
    referrer_host: null,
    ip_hash: null,
    is_probable_bot: false,
    vpn_indication: false,
    proxy_indication: false,
    tor_indication: false,
    datacenter_indication: false,
    security_signals: {},
    previous_visit_count: 0,
    is_returning_visit: false,
  }
  const sessionInsert = vi.fn()
  const sessionInsertResult = {
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: sessionId }, error: null }),
    }),
  }
  let shareCall = 0
  let repositoryCall = 0
  let githubInstallationCall = 0
  let viewerSessionHashFilter: string | undefined
  const syncRepository = { ...repository, github_owner: 'octocat', github_repo: 'hello-world' }
  const updateQuery = createQuery({ data: syncRepository, error: null })

  const admin = {
    from(table: string) {
      if (table === 'shares') {
        const call = createQuery({
          data: shareCall === 0 ? share : { ...share, repository, viewer_sessions: [session] },
          error: null,
        })
        shareCall += 1
        call.eq.mockImplementation((field: string, value: string) => {
          if (field === 'viewer_sessions.session_token_hash') viewerSessionHashFilter = value
          return call
        })
        return call
      }
      if (table === 'workspaces') return createQuery({ data: { status: 'active' }, error: null })
      if (table === 'repositories') {
        repositoryCall += 1
        if (repositoryCall === 1) return createQuery({ data: repository, error: null })
        const lookup = createQuery({ data: repository, error: null })
        lookup.update.mockReturnValue(updateQuery)
        return lookup
      }
      if (table === 'github_installations') {
        githubInstallationCall += 1
        if (githubInstallationCall === 1 || githubInstallationCall === 2) return createQuery({ data: installation, error: null })
        return createQuery({ data: [installation], error: null })
      }
      if (table === 'viewer_sessions') {
        const query = createQuery({ data: [], error: null })
        query.insert.mockImplementation((input: unknown) => {
          sessionInsert(input)
          return sessionInsertResult
        })
        query.eq.mockImplementation((field: string, value: string) => {
          if (field === 'viewer_sessions.session_token_hash') viewerSessionHashFilter = value
          return query
        })
        return query
      }
      return createQuery({ data: null, error: null })
    },
  }

  return {
    admin,
    installation,
    githubRepository: {
      githubRepositoryId: 42,
      githubNodeId: 'node-42',
      installationRecordId: installationId,
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
      private: true,
      defaultBranch: 'main',
      description: null,
      htmlUrl: 'https://github.com/octocat/hello-world',
      archived: false,
      disabled: false,
    },
    sessionInsert,
    get viewerSessionHashFilter() {
      return viewerSessionHashFilter
    },
  }
}

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    not: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  }
  query.select.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.neq.mockReturnValue(query)
  query.not.mockReturnValue(query)
  query.is.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  return query
}
