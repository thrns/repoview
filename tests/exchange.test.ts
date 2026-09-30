import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))
vi.mock('../lib/analytics/identity', () => ({
  findOrCreateViewer: vi.fn(),
}))
vi.mock('../lib/viewer/view-events', () => ({ recordViewerViewEvent: vi.fn().mockResolvedValue({ recorded: true }) }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { hashShareToken } from '../lib/security/tokens'
import { findOrCreateViewer } from '../lib/analytics/identity'
import { type LinkOpenMetadata } from '../lib/shares/link-open-metadata'
import { exchangeShareToken, ShareExchangeError } from '../lib/shares/exchange'
import { recordViewerViewEvent } from '../lib/viewer/view-events'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const getViewer = vi.mocked(findOrCreateViewer)
const recordViewEvent = vi.mocked(recordViewerViewEvent)
const rawShareToken = 'share-token'

beforeEach(() => {
  recordViewEvent.mockClear()
  getViewer.mockClear()
})

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

function createAdminMock(
  repositoryEnabled = true,
  workspaceStatus: 'active' | 'deleting' | 'deleted' = 'active',
  shareOverrides: Partial<{ revoked_at: string | null; expires_at: string | null }> = {},
  sharePresent = true,
  shareCode = 'Ab3k9Qx2',
  sessionIds = ['33333333-3333-4333-8333-333333333333'],
  installationStatus: 'active' | 'inactive' = 'active',
) {
  const share = {
    id: '22222222-2222-4222-8222-222222222222',
    repository_id: '11111111-1111-4111-8111-111111111111',
    workspace_id: '77777777-7777-4777-8777-777777777777',
    share_code: shareCode,
    token_hash: 'stored-hash',
    recipient_label: 'Interview',
    ref: 'heads/main',
    expires_at: shareOverrides.expires_at ?? null,
    revoked_at: shareOverrides.revoked_at ?? null,
    notify_on_view: true,
    allow_download: false,
    rules: {},
    note: null,
    created_by: null,
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  }
  const authorizationStatus = !sharePresent
    ? null
    : shareOverrides.revoked_at
      ? 'revoked'
      : shareOverrides.expires_at
        ? 'expired'
        : workspaceStatus !== 'active' || !repositoryEnabled || installationStatus !== 'active'
          ? 'repository_unavailable'
          : 'authorized'
  const rpc = vi.fn().mockResolvedValue({
    data: authorizationStatus
      ? [{
          authorization_status: authorizationStatus,
          share: {
            id: share.id,
            workspace_id: share.workspace_id,
            repository_id: share.repository_id,
            share_code: share.share_code,
            ref: share.ref,
            expires_at: share.expires_at,
            created_at: share.created_at,
            updated_at: share.updated_at,
          },
        }]
      : [],
    error: null,
  })
  const sessionInsert = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: sessionIds[Math.min(sessionInsert.mock.calls.length - 1, sessionIds.length - 1)] }, error: null }),
    }),
  }))
  const eventInsert = vi.fn().mockResolvedValue({ error: null })
  const previousCountSelect = vi.fn().mockReturnThis()
  const admin = {
    rpc,
    from(table: string) {
      if (table === 'viewer_sessions') {
        const query = {
          select: previousCountSelect,
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({ count: 2, error: null }),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockReturnThis(),
          insert: sessionInsert,
        }
        query.eq.mockReturnThis()
        return query
      }
      return { insert: eventInsert }
    },
  }

  return { admin, rpc, sessionInsert, eventInsert, previousCountSelect }
}

describe('share token exchange', () => {
  it('rejects an invalid capability and records a failed access attempt', async () => {
    const { admin, eventInsert } = createAdminMock(true, 'active', {}, false)
    getAdmin.mockReturnValue(admin as never)

    await expect(exchangeShareToken('not-a-valid-share-code')).rejects.toMatchObject({ code: 'invalid' })
    expect(eventInsert).toHaveBeenCalledWith(expect.objectContaining({ valid: false, failure_reason: 'invalid' }))
  })

  it('rejects revoked and expired shares before creating viewer sessions', async () => {
    const revoked = createAdminMock(true, 'active', { revoked_at: '2026-09-21T01:00:00.000Z' })
    getAdmin.mockReturnValue(revoked.admin as never)
    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({ code: 'revoked' })
    expect(revoked.sessionInsert).not.toHaveBeenCalled()

    const expired = createAdminMock(true, 'active', { expires_at: '2020-01-01T00:00:00.000Z' })
    getAdmin.mockReturnValue(expired.admin as never)
    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({ code: 'expired' })
    expect(expired.sessionInsert).not.toHaveBeenCalled()
  })

  it('stores only the viewer-session hash and records link_opened', async () => {
    const { admin, rpc, sessionInsert, eventInsert, previousCountSelect } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)
    getViewer.mockResolvedValue({
      viewer: { id: 'viewer-1', viewer_code: 'A123', viewer_token_hash: 'hash', workspace_id: '77777777-7777-4777-8777-777777777777', first_seen_at: '2026-09-21T00:00:00.000Z', last_seen_at: '2026-09-21T00:00:00.000Z' },
      rawViewerId: 'viewer-token-12345678901234567890',
      isNew: true,
    })

    const metadata: LinkOpenMetadata = {
      referrerHost: 'example.com',
      fetchSite: 'cross-site',
      isPrefetch: true,
      browser: 'Chrome',
      os: 'Windows',
      deviceType: 'desktop',
      country: 'CA',
      publicIp: '203.0.113.42',
      isProbableBot: true,
    }
    const result = await exchangeShareToken(rawShareToken, metadata, undefined, { analyticsMode: 'optional' })

    expect(result.shareId).toBe('22222222-2222-4222-8222-222222222222')
    expect(result.shareCode).toBe('Ab3k9Qx2')
    expect(rpc).toHaveBeenCalledWith('resolve_share_capability', { target_token_hash: hashShareToken(rawShareToken) })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(rawShareToken)
    expect(previousCountSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(result.rawSessionToken).not.toBe(rawShareToken)
    expect(sessionInsert).toHaveBeenCalledWith(expect.objectContaining({
      share_id: '22222222-2222-4222-8222-222222222222',
      session_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      referrer_host: 'example.com',
      browser: 'Chrome',
      os: 'Windows',
      device_type: 'desktop',
      country: 'CA',
      is_probable_bot: true,
    }))
    expect(sessionInsert.mock.calls[0]?.[0]).toHaveProperty('ip_hash', expect.stringMatching(/^[a-f0-9]{64}$/))
    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('public_ip')
    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('rawSessionToken')
    expect(JSON.stringify(sessionInsert.mock.calls)).not.toContain(result.rawSessionToken)
    expect(eventInsert).toHaveBeenCalledWith(expect.objectContaining({ token_hash: hashShareToken(rawShareToken) }))
    expect(JSON.stringify(eventInsert.mock.calls)).not.toContain(rawShareToken)
    expect(recordViewEvent).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: '77777777-7777-4777-8777-777777777777',
      shareId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
      eventType: 'link_opened',
    }))
  })

  it('defaults a new session to necessary-only analytics without a viewer identity', async () => {
    const { admin, sessionInsert, eventInsert } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)

    await exchangeShareToken(rawShareToken)

    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('confirmed_at')
    expect(sessionInsert.mock.calls[0]?.[0]).toMatchObject({ analytics_mode: 'necessary', gpc_applied: false })
    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('viewer_id')
    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('browser')
    expect(eventInsert.mock.calls[0]?.[0]).toMatchObject({ valid: true })
    expect(recordViewEvent).not.toHaveBeenCalled()
    expect(eventInsert.mock.calls[0]?.[0]).not.toMatchObject({ event_type: 'link_opened' })
  })

  it('creates a new session for every separate share exchange, including the nine-character public code flow', async () => {
    const sessions = createAdminMock(
      true,
      'active',
      {},
      true,
      'aB3xK9pQ2',
      ['session-1', 'session-2', 'session-3'],
    )
    getAdmin.mockReturnValue(sessions.admin as never)

    const first = await exchangeShareToken('aB3xK9pQ2')
    const second = await exchangeShareToken('aB3xK9pQ2')
    const third = await exchangeShareToken('aB3xK9pQ2')

    expect([first, second, third].map((result) => result.shareCode)).toEqual(['aB3xK9pQ2', 'aB3xK9pQ2', 'aB3xK9pQ2'])
    expect(sessions.sessionInsert).toHaveBeenCalledTimes(3)
    expect(new Set(sessions.sessionInsert.mock.calls.map(([row]) => (row as { session_token_hash: string }).session_token_hash)).size).toBe(3)
  })

  it('keeps a returning anonymous viewer code stable while allocating new sessions', async () => {
    const sessions = createAdminMock(true, 'active', {}, true, 'aB3xK9pQ2', ['session-1', 'session-2', 'session-3'])
    getAdmin.mockReturnValue(sessions.admin as never)
    getViewer.mockResolvedValue({
      viewer: { id: 'viewer-1', viewer_code: 'A123', viewer_token_hash: 'hash', workspace_id: '77777777-7777-4777-8777-777777777777', first_seen_at: '2026-09-21T00:00:00.000Z', last_seen_at: '2026-09-21T00:00:00.000Z' },
      rawViewerId: 'viewer-token-12345678901234567890',
      isNew: false,
    })

    const results = await Promise.all([
      exchangeShareToken(rawShareToken, undefined, 'viewer-token-12345678901234567890', { analyticsMode: 'optional' }),
      exchangeShareToken(rawShareToken, undefined, 'viewer-token-12345678901234567890', { analyticsMode: 'optional' }),
      exchangeShareToken(rawShareToken, undefined, 'viewer-token-12345678901234567890', { analyticsMode: 'optional' }),
    ])

    expect(results.map((result) => result.viewerCode)).toEqual(['A123', 'A123', 'A123'])
    expect(sessions.sessionInsert).toHaveBeenCalledTimes(3)
    expect(getViewer).toHaveBeenCalledTimes(3)
  })

  it('marks prefetch access as non-genuine even when the user agent is not a known bot', async () => {
    const { admin, sessionInsert } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)

    await exchangeShareToken(rawShareToken, { isPrefetch: true, isProbableBot: false })

    expect(sessionInsert).toHaveBeenCalledWith(expect.objectContaining({ is_probable_bot: true }))
  })

  it('rejects a disabled repository before creating a viewer session', async () => {
    const { admin, sessionInsert } = createAdminMock(false)
    getAdmin.mockReturnValue(admin as never)

    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({
      code: 'repository_unavailable',
    })
    await expect(exchangeShareToken(rawShareToken)).rejects.toBeInstanceOf(ShareExchangeError)
    expect(sessionInsert).not.toHaveBeenCalled()
  })

  it('rejects an inactive GitHub installation before creating a viewer session', async () => {
    const { admin, sessionInsert } = createAdminMock(true, 'active', {}, true, 'Ab3k9Qx2', undefined, 'inactive')
    getAdmin.mockReturnValue(admin as never)

    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({ code: 'repository_unavailable' })
    expect(sessionInsert).not.toHaveBeenCalled()
  })

  it('rejects a share as soon as its workspace enters deletion state', async () => {
    const { admin, sessionInsert } = createAdminMock(true, 'deleting')
    getAdmin.mockReturnValue(admin as never)

    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({ code: 'repository_unavailable' })
    expect(sessionInsert).not.toHaveBeenCalled()
  })

  it('treats Global Privacy Control as necessary-only even when optional analytics was requested', async () => {
    const { admin, sessionInsert } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)
    getViewer.mockClear()

    await exchangeShareToken(rawShareToken, undefined, 'viewer-token-12345678901234567890', { analyticsMode: 'optional', gpc: true })

    expect(getViewer).not.toHaveBeenCalled()
    expect(sessionInsert.mock.calls[0]?.[0]).toMatchObject({ analytics_mode: 'necessary', gpc_applied: true })
    expect(sessionInsert.mock.calls[0]?.[0]).not.toHaveProperty('viewer_id')
  })
})
