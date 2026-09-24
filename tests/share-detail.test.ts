import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/auth/workspace', () => ({ requireShareAccess: vi.fn() }))

import { getShareDetail, ShareDetailNotFoundError } from '../lib/shares/detail'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { requireShareAccess } from '../lib/auth/workspace'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const getShareAccess = vi.mocked(requireShareAccess)

function createAdminMock() {
  const share = {
    id: '11111111-1111-4111-8111-111111111111',
    repository_id: '22222222-2222-4222-8222-222222222222',
    token_hash: 'hash',
    recipient_label: 'Hiring panel',
    ref: 'main',
    expires_at: null,
    revoked_at: null,
    notify_on_view: true,
    allow_download: false,
    rules: { hidden: ['docs/private/**'], allowOnly: [] },
    note: 'Frontend review',
    created_by: null,
    created_at: '2026-09-20T10:00:00.000Z',
    updated_at: '2026-09-20T10:00:00.000Z',
  }
  const repository = {
    id: share.repository_id,
    github_owner: 'octocat',
    github_repo: 'hello-world',
    default_branch: 'main',
    enabled: true,
    default_rules: { hidden: [], allowOnly: [] },
    created_at: share.created_at,
    updated_at: share.created_at,
  }
  const sessions = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      share_id: share.id,
      session_token_hash: 'session-hash',
      first_seen_at: '2026-09-21T10:00:00.000Z',
      last_seen_at: '2026-09-21T10:05:00.000Z',
      confirmed_at: '2026-09-21T10:01:00.000Z',
      notified_at: '2026-09-21T10:02:00.000Z',
      user_agent: null,
      browser: 'Brave',
      os: 'macOS',
      device_type: 'desktop',
      country: 'CA',
      referrer_host: null,
      ip_hash: null,
      is_probable_bot: false,
    },
    {
      ...sessionsPlaceholder(),
      id: '44444444-4444-4444-8444-444444444444',
      first_seen_at: '2026-09-21T09:00:00.000Z',
      last_seen_at: '2026-09-21T09:00:01.000Z',
    },
  ]
  const events = [{ id: 1, share_id: share.id, session_id: sessions[0].id, event_type: 'file_viewed', path: 'src/index.ts', metadata: {}, created_at: '2026-09-21T10:04:00.000Z' }]
  const notifications = [{ id: '55555555-5555-4555-8555-555555555555', share_id: share.id, session_id: sessions[0].id, channel: 'email', status: 'sent', error_text: null, created_at: '2026-09-21T10:02:00.000Z', sent_at: '2026-09-21T10:02:01.000Z' }]
  const rows = { shares: { data: share, error: null }, repositories: { data: repository, error: null }, viewer_sessions: { data: sessions, error: null }, view_events: { data: events, error: null }, notification_deliveries: { data: notifications, error: null } }

  const admin = {
    from(table: keyof typeof rows) {
      const result = rows[table]
      const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
      }
      return builder
    },
  }

  return { admin, share, sessions, events, notifications }
}

function sessionsPlaceholder() {
  return {
    share_id: '11111111-1111-4111-8111-111111111111',
    session_token_hash: 'scanner-hash',
    confirmed_at: null,
    notified_at: null,
    user_agent: null,
    browser: null,
    os: null,
    device_type: null,
    country: null,
    referrer_host: null,
    ip_hash: null,
    is_probable_bot: true,
  }
}

describe('share detail data', () => {
  it('maps lifecycle, sessions, activity, and notification data', async () => {
    const { admin, share, sessions } = createAdminMock()
    getAdmin.mockReturnValue(admin as never)
    getShareAccess.mockResolvedValue({ workspace: { id: 'workspace-1' }, share: { ...share, workspace_id: 'workspace-1' } } as never)

    const detail = await getShareDetail(share.id, new Date('2026-09-21T12:00:00.000Z'))

    expect(detail.item).toMatchObject({ confirmedViews: 1, lastViewedAt: sessions[0].last_seen_at, status: 'active' })
    expect(detail.sessions[0]).toMatchObject({ confirmedAt: sessions[0].confirmed_at, approximateDurationMinutes: 4, browser: 'Brave', viewedPaths: ['src/index.ts'] })
    expect(detail.activity[0]).toMatchObject({ eventType: 'file_viewed', path: 'src/index.ts' })
    expect(detail.notifications[0]).toMatchObject({ status: 'sent', sentAt: '2026-09-21T10:02:01.000Z' })
  })

  it('rejects invalid IDs before querying storage', async () => {
    getAdmin.mockClear()
    await expect(getShareDetail('not-a-uuid')).rejects.toBeInstanceOf(ShareDetailNotFoundError)
    expect(getAdmin).not.toHaveBeenCalled()
  })

  it('does not inspect a share from another workspace', async () => {
    const { share } = createAdminMock()
    getAdmin.mockClear()
    getShareAccess.mockRejectedValueOnce(new Error('forbidden'))

    await expect(getShareDetail(share.id)).rejects.toBeInstanceOf(ShareDetailNotFoundError)
    expect(getAdmin).not.toHaveBeenCalled()
  })
})
