import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/env/public', () => ({ getPublicEnv: vi.fn(() => ({ NEXT_PUBLIC_APP_URL: 'https://code.example.com' })) }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/notifications/delivery', () => ({ queueNotificationDelivery: vi.fn() }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { notifyConfirmedViewer } from '../lib/notifications/notify-view'
import { queueNotificationDelivery } from '../lib/notifications/delivery'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const queueDelivery = vi.mocked(queueNotificationDelivery)

const input = {
  shareId: '22222222-2222-4222-8222-222222222222',
  sessionId: '33333333-3333-4333-8333-333333333333',
  confirmedAt: '2026-09-22T00:00:00.000Z',
  now: new Date('2026-09-22T00:00:01.000Z'),
  share: { workspace_id: '11111111-1111-4111-8111-111111111111', recipient_label: 'Interview', ref: 'heads/main', notify_on_view: true },
  repository: { github_owner: 'octocat', github_repo: 'hello-world' },
  session: { browser: 'Chrome', os: 'macOS', device_type: 'desktop', country: 'CA', is_probable_bot: false },
}

function createAdminMock(claim: object | null, settings = { destination_email: 'alice@example.com', email_verified: true, view_opened: true, returning_view: true, session_summary: true }) {
  const update = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const is = vi.fn().mockReturnThis()
  const select = vi.fn().mockReturnThis()
  const maybeSingle = vi.fn().mockResolvedValue({ data: claim, error: null })
  const deliveryInsert = vi.fn().mockResolvedValue({ error: null })
  const admin = {
    from(table: string) {
      if (table === 'viewer_sessions') return { update, eq, is, select, maybeSingle }
      if (table === 'notification_settings') return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: settings, error: null }),
      }
      return { insert: deliveryInsert }
    },
  }
  return { admin, update, eq, is, select, deliveryInsert }
}

beforeEach(() => {
  queueDelivery.mockReset()
  queueDelivery.mockResolvedValue({ status: 'queued', deliveryId: 'delivery-1' })
})

describe('confirmed-view notification', () => {
  it('composes and queues one idempotent delivery without calling a provider', async () => {
    const { admin, deliveryInsert } = createAdminMock({ id: input.sessionId })
    getAdmin.mockReturnValue(admin as never)

    await expect(notifyConfirmedViewer(input)).resolves.toEqual({ status: 'queued', deliveryId: 'delivery-1' })

    expect(queueDelivery).toHaveBeenCalledWith(admin, expect.objectContaining({
      recipient: 'alice@example.com',
      notificationKind: 'view_opened',
      idempotencyKey: `view_opened:${input.sessionId}`,
      email: expect.objectContaining({ subject: 'RepoView: Interview viewed octocat/hello-world' }),
    }))
    expect(deliveryInsert).not.toHaveBeenCalled()
  })

  it('does not queue again when the idempotent delivery already exists', async () => {
    queueDelivery.mockResolvedValue({ status: 'already-queued' })
    const { admin, deliveryInsert } = createAdminMock({ id: input.sessionId })
    getAdmin.mockReturnValue(admin as never)

    await expect(notifyConfirmedViewer(input)).resolves.toEqual({ status: 'already-attempted' })
    expect(deliveryInsert).not.toHaveBeenCalled()
  })

  it('keeps queue failures outside the viewer confirmation response boundary', async () => {
    queueDelivery.mockRejectedValue(new Error('database unavailable'))
    const { admin } = createAdminMock({ id: input.sessionId })
    getAdmin.mockReturnValue(admin as never)

    await expect(notifyConfirmedViewer(input)).rejects.toThrow('database unavailable')
  })

  it('does not send when the workspace destination is missing or unverified', async () => {
    const { admin, deliveryInsert } = createAdminMock({ id: input.sessionId }, { destination_email: 'bob@example.com', email_verified: false, view_opened: true, returning_view: true, session_summary: true })
    getAdmin.mockReturnValue(admin as never)

    await expect(notifyConfirmedViewer(input)).resolves.toEqual({ status: 'unconfigured' })
    expect(queueDelivery).not.toHaveBeenCalled()
    expect(deliveryInsert).not.toHaveBeenCalled()
  })

  it('skips disabled shares and probable scanners before claiming or sending', async () => {
    const disabled = { ...input, share: { ...input.share, notify_on_view: false } }
    await expect(notifyConfirmedViewer(disabled)).resolves.toEqual({ status: 'disabled' })
    const bot = { ...input, session: { ...input.session, is_probable_bot: true } }
    await expect(notifyConfirmedViewer(bot)).resolves.toEqual({ status: 'probable-bot' })
    expect(queueDelivery).not.toHaveBeenCalled()
  })
})
