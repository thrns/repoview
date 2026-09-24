import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import {
  authorizeViewerSession,
  ViewerAuthorizationError,
} from '../lib/auth/viewer-session'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const shareId = '22222222-2222-4222-8222-222222222222'
const sessionId = '33333333-3333-4333-8333-333333333333'
const repositoryId = '11111111-1111-4111-8111-111111111111'

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
  revokedAt?: string | null
  expiresAt?: string | null
  repositoryEnabled?: boolean
  workspaceStatus?: 'active' | 'deleting' | 'deleted'
} = {}) {
  const session = {
    id: sessionId,
    share_id: shareId,
    session_token_hash: 'session-hash',
    first_seen_at: '2026-09-21T00:00:00.000Z',
    last_seen_at: '2026-09-21T00:00:00.000Z',
    confirmed_at: null,
    notified_at: null,
    user_agent: null,
    browser: null,
    os: null,
    device_type: null,
    country: null,
    referrer_host: null,
    ip_hash: null,
    is_probable_bot: false,
  }
  const share = {
    id: shareId,
    repository_id: repositoryId,
    workspace_id: 'workspace-1',
    share_code: 'Ab3k9Qx2',
    token_hash: 'share-hash',
    recipient_label: 'Interview',
    ref: 'heads/main',
    expires_at: overrides.expiresAt ?? null,
    revoked_at: overrides.revokedAt ?? null,
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
    workspace_id: 'workspace-1',
    github_owner: 'octocat',
    github_repo: 'hello-world',
    default_branch: 'main',
    enabled: overrides.repositoryEnabled ?? true,
    default_rules: {},
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  }
  const joinedShare = { ...share, repository, viewer_sessions: [session] }
  const admin = {
    from(table: string) {
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { status: overrides.workspaceStatus ?? 'active' }, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: joinedShare, error: null }),
      }
    },
  }
  return admin
}

describe('viewer session authorization', () => {
  it('requires a valid session/share relationship and returns authorized context', async () => {
    getAdmin.mockReturnValue(createAdminMock() as never)

    await expect(authorizeViewerSession(shareId, 'raw-session-token')).resolves.toMatchObject({
      session: { id: sessionId, share_id: shareId },
      share: { id: shareId, repository_id: repositoryId },
      repository: { id: repositoryId, enabled: true },
    })
  })

  it('resolves the short public share code to the internal share', async () => {
    getAdmin.mockReturnValue(createAdminMock() as never)

    await expect(authorizeViewerSession('Ab3k9Qx2', 'raw-session-token')).resolves.toMatchObject({
      shareId,
      shareCode: 'Ab3k9Qx2',
      session: { id: sessionId, share_id: shareId },
    })
  })

  it.each([
    { label: 'missing cookie', token: undefined, shareId },
    { label: 'wrong share id', token: 'raw-session-token', shareId: 'not-a-uuid' },
    { label: 'revoked share', token: 'raw-session-token', shareId, overrides: { revokedAt: '2026-09-21T01:00:00.000Z' } },
    { label: 'expired share', token: 'raw-session-token', shareId, overrides: { expiresAt: '2020-01-01T00:00:00.000Z' } },
    { label: 'disabled repository', token: 'raw-session-token', shareId, overrides: { repositoryEnabled: false } },
    { label: 'deleting workspace', token: 'raw-session-token', shareId, overrides: { workspaceStatus: 'deleting' as const } },
  ])('denies $label', async ({ token, shareId: effectiveShareId, overrides }) => {
    getAdmin.mockReturnValue(createAdminMock(overrides) as never)

    await expect(authorizeViewerSession(effectiveShareId, token)).rejects.toBeInstanceOf(ViewerAuthorizationError)
  })
})
