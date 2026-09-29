import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn(() => ({ NOTIFICATION_DISPATCH_SECRET: 'd'.repeat(32), CRON_SECRET: 'c'.repeat(32) })) }))
vi.mock('../lib/notifications/delivery', () => ({ dispatchPendingNotificationDeliveries: vi.fn() }))

import { GET, POST } from '../app/api/internal/notifications/dispatch/route'
import { dispatchPendingNotificationDeliveries } from '../lib/notifications/delivery'

const dispatchPending = vi.mocked(dispatchPendingNotificationDeliveries)

beforeEach(() => {
  dispatchPending.mockReset()
  dispatchPending.mockResolvedValue([])
})

describe('internal notification dispatcher route', () => {
  it('rejects public requests', async () => {
    await expect(GET(new Request('https://repoview.test/api/internal/notifications/dispatch'))).resolves.toMatchObject({ status: 401 })
    expect(dispatchPending).not.toHaveBeenCalled()
  })

  it('accepts the trusted scheduler secret for GET and dispatches pending work', async () => {
    const response = await GET(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'c'.repeat(32)}` },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ processed: 0 })
    expect(dispatchPending).toHaveBeenCalledTimes(1)
  })

  it('also keeps the explicit dispatch secret available for non-cron callers', async () => {
    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'d'.repeat(32)}` },
    }))
    expect(response.status).toBe(200)
  })
})
