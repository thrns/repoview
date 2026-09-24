import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('../lib/notifications/email-provider', async () => {
  class MockProviderError extends Error {
    readonly retryable: boolean
    readonly provider = 'resend' as const

    constructor(_provider: string, retryable: boolean) {
      super('Transactional email delivery failed.')
      this.retryable = retryable
    }
  }
  return { sendTransactionalEmail: vi.fn(), TransactionalEmailProviderError: MockProviderError }
})

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { dispatchNotificationDelivery, queueNotificationDelivery } from '../lib/notifications/delivery'
import { sendTransactionalEmail, TransactionalEmailProviderError } from '../lib/notifications/email-provider'

const getAdmin = vi.mocked(createSupabaseAdminClient)
const sendEmail = vi.mocked(sendTransactionalEmail)

const email = {
  to: 'alice@example.com',
  subject: 'RepoView: repository viewed',
  text: 'A repository was viewed.',
}

function chain(result: unknown) {
  type QueryBuilder = {
    select: (...args: unknown[]) => QueryBuilder
    eq: (...args: unknown[]) => QueryBuilder
    in: (...args: unknown[]) => QueryBuilder
    or: (...args: unknown[]) => QueryBuilder
    order: (...args: unknown[]) => QueryBuilder
    limit: (...args: unknown[]) => QueryBuilder
    maybeSingle: () => Promise<unknown>
    then: Promise<unknown>['then']
  }
  const builder = {} as QueryBuilder
  for (const method of ['select', 'eq', 'in', 'or', 'order', 'limit'] as const) builder[method] = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = ((resolve, reject) => Promise.resolve(result).then(resolve ?? undefined, reject ?? undefined)) as Promise<unknown>['then']
  return builder
}

function createDeliveryAdmin(claimResult: unknown) {
  const updates = [claimResult, { error: null }, { error: null }]
  let fromCalls = 0
  const from = vi.fn(() => {
    const updateIndex = fromCalls++
    const update = vi.fn(() => chain(updates[updateIndex] ?? { error: null }))
    return { update, from }
  })
  const admin = { from } as never
  return { admin, from }
}

beforeEach(() => {
  sendEmail.mockReset()
  sendEmail.mockResolvedValue({ provider: 'resend', providerMessageId: 'message-1' })
})

describe('notification delivery ledger', () => {
  it('uses the idempotency key to enqueue a notification only once', async () => {
    const upsert = vi.fn(() => chain({ data: { id: 'delivery-1' }, error: null }))
    const admin = { from: vi.fn(() => ({ upsert })) } as never

    await expect(queueNotificationDelivery(admin, {
      workspaceId: 'workspace-1',
      shareId: 'share-1',
      sessionId: 'session-1',
      recipient: 'alice@example.com',
      notificationKind: 'view_opened',
      idempotencyKey: 'view_opened:session-1',
      email,
    })).resolves.toEqual({ status: 'queued', deliveryId: 'delivery-1' })
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      status: 'pending',
      recipient: 'alice@example.com',
      idempotency_key: 'view_opened:session-1',
    }), { onConflict: 'idempotency_key', ignoreDuplicates: true })

    upsert.mockImplementation(() => chain({ data: null, error: null }))
    await expect(queueNotificationDelivery(admin, {
      workspaceId: 'workspace-1',
      shareId: 'share-1',
      sessionId: 'session-1',
      recipient: 'alice@example.com',
      notificationKind: 'view_opened',
      idempotencyKey: 'view_opened:session-1',
      email,
    })).resolves.toEqual({ status: 'already-queued' })
  })

  it('marks a successful provider attempt with its provider message id', async () => {
    const delivery = {
      id: 'delivery-1',
      attempt_count: 0,
      payload: { email },
    }
    const { admin, from } = createDeliveryAdmin({ data: delivery, error: null })
    getAdmin.mockReturnValue(admin)

    await expect(dispatchNotificationDelivery('delivery-1', admin, new Date('2026-09-24T10:00:00.000Z')))
      .resolves.toEqual({ status: 'sent', deliveryId: 'delivery-1' })
    expect(sendEmail).toHaveBeenCalledWith(email)
    expect(from).toHaveBeenCalled()
  })

  it('schedules retryable provider failures without exposing provider details', async () => {
    sendEmail.mockRejectedValue(new TransactionalEmailProviderError('resend', true))
    const { admin } = createDeliveryAdmin({ data: { id: 'delivery-1', attempt_count: 0, payload: { email } }, error: null })

    await expect(dispatchNotificationDelivery('delivery-1', admin, new Date('2026-09-24T10:00:00.000Z')))
      .resolves.toEqual({ status: 'retryable', deliveryId: 'delivery-1', nextRetryAt: '2026-09-24T10:01:00.000Z' })
  })

  it('marks permanent provider failures without retrying them', async () => {
    sendEmail.mockRejectedValue(new TransactionalEmailProviderError('resend', false))
    const { admin } = createDeliveryAdmin({ data: { id: 'delivery-1', attempt_count: 0, payload: { email } }, error: null })

    await expect(dispatchNotificationDelivery('delivery-1', admin, new Date('2026-09-24T10:00:00.000Z')))
      .resolves.toEqual({ status: 'permanent', deliveryId: 'delivery-1' })
  })
})
