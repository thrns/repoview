import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { getDashboardActivity } from '../lib/dashboard/activity'

const getAdmin = vi.mocked(createSupabaseAdminClient)

function query(value: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(value)),
  }
  return builder
}

describe('dashboard activity', () => {
  it('merges persisted view and notification rows chronologically', async () => {
    const shareId = 'share-1'
    const repositoryId = 'repo-1'
    let shareQuery = false
    let repositoryQuery = false
    let sessionQuery = false
    const admin = {
      from(table: string) {
        if (table === 'view_events') return query({ data: [
          { id: 1, share_id: shareId, session_id: 'session-1', event_type: 'file_viewed', path: 'src/index.ts', created_at: '2026-09-21T10:00:00.000Z', metadata: {} },
          { id: 2, share_id: shareId, session_id: 'session-1', event_type: 'heartbeat', path: null, created_at: '2026-09-21T11:00:00.000Z', metadata: {} },
        ], error: null })
        if (table === 'notification_deliveries') return query({ data: [{ id: 'notice-1', share_id: shareId, session_id: 'session-1', channel: 'email', status: 'sent', error_text: null, created_at: '2026-09-21T12:00:00.000Z', sent_at: '2026-09-21T12:00:01.000Z' }], error: null })
        if (table === 'shares') { shareQuery = true; return query({ data: [{ id: shareId, recipient_label: 'Interview', repository_id: repositoryId }], error: null }) }
        if (table === 'repositories') { repositoryQuery = true; return query({ data: [{ id: repositoryId, github_owner: 'octocat', github_repo: 'hello-world' }], error: null }) }
        if (table === 'viewer_sessions') { sessionQuery = true; return query({ data: [{ id: 'session-1', browser: 'Chrome', device_type: 'desktop', country: 'CA' }], error: null }) }
        throw new Error(`Unexpected table ${table}`)
      },
    }
    getAdmin.mockReturnValue(admin as never)

    await expect(getDashboardActivity()).resolves.toMatchObject([
      { category: 'notification', status: 'sent' },
      { category: 'view', eventType: 'file_viewed', path: 'src/index.ts', browser: 'Chrome' },
    ])
    expect(shareQuery).toBe(true)
    expect(repositoryQuery).toBe(true)
    expect(sessionQuery).toBe(true)
  })

  it('applies the views filter and ignores heartbeat rows', async () => {
    const admin = {
      from(table: string) {
        if (table === 'view_events') return query({ data: [{ id: 1, share_id: 'share-1', session_id: 'session-1', event_type: 'view_confirmed', path: null, created_at: '2026-09-21T10:00:00.000Z', metadata: {} }], error: null })
        if (table === 'notification_deliveries') return query({ data: [], error: null })
        if (table === 'shares') return query({ data: [{ id: 'share-1', recipient_label: 'Interview', repository_id: 'repo-1' }], error: null })
        if (table === 'repositories') return query({ data: [{ id: 'repo-1', github_owner: 'octocat', github_repo: 'hello-world' }], error: null })
        if (table === 'viewer_sessions') return query({ data: [{ id: 'session-1', browser: null, device_type: null, country: null }], error: null })
        throw new Error(`Unexpected table ${table}`)
      },
    }
    getAdmin.mockReturnValue(admin as never)

    await expect(getDashboardActivity('views')).resolves.toHaveLength(1)
  })
})
