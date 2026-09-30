import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { hashViewerSessionToken } from '../lib/security/tokens'
import {
  authorizeViewerSession,
  ViewerAuthorizationError,
} from '../lib/auth/viewer-session'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const shareId = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'
const repositoryId = '11111111-1111-4111-8111-111111111111'
const sessionToken = 'raw-session-token'

beforeAll(() => {
  Object.assign(process.env, {
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

function createAdminMock(overrides: {
  authorizationStatus?: string
  repositoryEnabled?: boolean
  repositoryIdentity?: number | null
} = {}) {
  const session = {
    id: sessionId,
    share_id: shareId,
    workspace_id: 'workspace-1',
    viewer_id: null,
    analytics_mode: 'necessary',
    gpc_applied: false,
    last_seen_at: '2026-09-21T00:00:00.000Z',
    confirmed_at: null,
    active_ms: 0,
    security_signals: {},
    entry_path: null,
    browser: null,
    os: null,
    device_type: null,
    country: null,
    city: null,
    region: null,
    referrer_host: null,
    is_probable_bot: false,
    vpn_indication: null,
    proxy_indication: null,
    tor_indication: null,
    datacenter_indication: null,
  }
  const share = {
    id: shareId,
    repository_id: repositoryId,
    workspace_id: 'workspace-1',
    share_code: 'Ab3k9Qx2',
    share_type: 'recipient',
    recipient_label: 'Interview',
    ref: 'heads/main',
    expires_at: null,
    notify_on_view: true,
    allow_download: false,
    rules: {},
  }
  const repository = {
    id: repositoryId,
    workspace_id: 'workspace-1',
    github_installation_id: '44444444-4444-4444-8444-444444444444',
    github_repository_id: overrides.repositoryIdentity === undefined ? 42 : overrides.repositoryIdentity,
    github_owner: 'octocat',
    github_repo: 'hello-world',
    enabled: overrides.repositoryEnabled ?? true,
    default_rules: {},
  }
  const rpc = vi.fn().mockResolvedValue({
    data: [{
      authorization_status: overrides.authorizationStatus ?? 'authorized',
      session,
      share,
      repository,
    }],
    error: null,
  })
  return { rpc, admin: { rpc } }
}

describe('viewer session authorization', () => {
  it('authorizes a valid UUID share and passes only the session hash to the RPC', async () => {
    const { admin, rpc } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)

    await expect(authorizeViewerSession(shareId, sessionToken)).resolves.toMatchObject({
      session: { id: sessionId, share_id: shareId },
      share: { id: shareId, repository_id: repositoryId },
      repository: { id: repositoryId, enabled: true },
    })
    expect(rpc).toHaveBeenCalledWith('authorize_viewer_session', {
      target_session_token_hash: hashViewerSessionToken(sessionToken),
      target_share_id: shareId,
      target_share_code: null,
    })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(sessionToken)
  })

  it('resolves a short public share code through the share-code RPC argument', async () => {
    const { admin, rpc } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)

    await expect(authorizeViewerSession('Ab3k9Qx2', sessionToken)).resolves.toMatchObject({
      shareId,
      shareCode: 'Ab3k9Qx2',
      session: { id: sessionId, share_id: shareId },
    })
    expect(rpc).toHaveBeenCalledWith('authorize_viewer_session', {
      target_session_token_hash: hashViewerSessionToken(sessionToken),
      target_share_id: null,
      target_share_code: 'Ab3k9Qx2',
    })
  })

  it.each([
    { label: 'missing cookie', token: undefined },
    { label: 'invalid share identifier', token: sessionToken, shareId: 'not-a-uuid' },
    { label: 'revoked share', token: sessionToken, overrides: { authorizationStatus: 'revoked' } },
    { label: 'expired share', token: sessionToken, overrides: { authorizationStatus: 'expired' } },
    { label: 'inactive workspace', token: sessionToken, overrides: { authorizationStatus: 'repository_unavailable' } },
    { label: 'disabled repository', token: sessionToken, overrides: { repositoryEnabled: false } },
    { label: 'missing stable repository identity', token: sessionToken, overrides: { repositoryIdentity: null } },
    { label: 'inactive installation', token: sessionToken, overrides: { authorizationStatus: 'repository_unavailable' } },
  ])('denies $label', async ({ token, shareId: effectiveShareId, overrides }) => {
    const { admin } = createAdminMock(overrides)
    getAdmin.mockReturnValue(admin as never)

    await expect(authorizeViewerSession(effectiveShareId ?? shareId, token)).rejects.toBeInstanceOf(ViewerAuthorizationError)
  })

  it('denies a session that does not match the requested share or workspace', async () => {
    const { admin, rpc } = createAdminMock()
    rpc.mockResolvedValue({ data: [], error: null })
    getAdmin.mockReturnValue(admin as never)

    await expect(authorizeViewerSession(shareId, sessionToken)).rejects.toMatchObject({ reason: 'invalid' })
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
