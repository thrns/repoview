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

function createAdminMock(repositoryEnabled = true, workspaceStatus: 'active' | 'deleting' | 'deleted' = 'active') {
  const share = {
    id: '22222222-2222-4222-8222-222222222222',
    repository_id: '11111111-1111-4111-8111-111111111111',
    workspace_id: '77777777-7777-4777-8777-777777777777',
    share_code: 'Ab3k9Qx2',
    token_hash: 'stored-hash',
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
    id: share.repository_id,
    github_owner: 'octocat',
    github_repo: 'hello-world',
    default_branch: 'main',
    enabled: repositoryEnabled,
    workspace_id: share.workspace_id,
    default_rules: {},
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  }
  const sessionInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: '33333333-3333-4333-8333-333333333333' }, error: null }),
    }),
  })
  const eventInsert = vi.fn().mockResolvedValue({ error: null })
  const admin = {
    from(table: string) {
      if (table === 'shares') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: share, error: null }),
        }
      }
      if (table === 'repositories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: repository, error: null }),
        }
      }
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { status: workspaceStatus }, error: null }),
        }
      }
      if (table === 'viewer_sessions') {
        return { insert: sessionInsert }
      }
      return { insert: eventInsert }
    },
  }

  return { admin, sessionInsert, eventInsert }
}

describe('share token exchange', () => {
  it('stores only the viewer-session hash and records link_opened', async () => {
    const { admin, sessionInsert } = createAdminMock()
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

  it('rejects a disabled repository before creating a viewer session', async () => {
    const { admin, sessionInsert } = createAdminMock(false)
    getAdmin.mockReturnValue(admin as never)

    await expect(exchangeShareToken(rawShareToken)).rejects.toMatchObject({
      code: 'repository_unavailable',
    })
    await expect(exchangeShareToken(rawShareToken)).rejects.toBeInstanceOf(ShareExchangeError)
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
