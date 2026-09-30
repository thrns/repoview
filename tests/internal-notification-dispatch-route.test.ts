import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn(() => ({ NOTIFICATION_DISPATCH_SECRET: 'd'.repeat(32), CRON_SECRET: 'c'.repeat(32) })) }))
vi.mock('../lib/notifications/delivery', () => ({ dispatchPendingNotificationDeliveries: vi.fn() }))

import * as dispatcherRoute from '../app/api/internal/notifications/dispatch/route'
import { dispatchPendingNotificationDeliveries } from '../lib/notifications/delivery'

const dispatchPending = vi.mocked(dispatchPendingNotificationDeliveries)
const { POST } = dispatcherRoute

beforeEach(() => {
  dispatchPending.mockReset()
  dispatchPending.mockResolvedValue([])
})

describe('internal notification dispatcher route', () => {
  it('rejects requests without authorization', async () => {
    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch'))

    expect(response.status).toBe(401)
    expect(dispatchPending).not.toHaveBeenCalled()
  })

  it('rejects an incorrect secret', async () => {
    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'x'.repeat(32)}` },
    }))

    expect(response.status).toBe(401)
    expect(dispatchPending).not.toHaveBeenCalled()
  })

  it('does not accept CRON_SECRET for notification dispatch', async () => {
    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'c'.repeat(32)}` },
    }))

    expect(response.status).toBe(401)
    expect(dispatchPending).not.toHaveBeenCalled()
  })

  it('accepts NOTIFICATION_DISPATCH_SECRET and dispatches pending work', async () => {
    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'d'.repeat(32)}` },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ processed: 0 })
    expect(dispatchPending).toHaveBeenCalledTimes(1)
  })

  it('returns a safe unavailable response when dispatch fails', async () => {
    dispatchPending.mockRejectedValueOnce(new Error('database details must stay private'))

    const response = await POST(new Request('https://repoview.test/api/internal/notifications/dispatch', {
      headers: { authorization: `Bearer ${'d'.repeat(32)}` },
    }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'unavailable' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('is POST-only', () => {
    const routeHandlers = dispatcherRoute as unknown as Record<string, unknown>
    expect(routeHandlers.POST).toEqual(expect.any(Function))
    expect(routeHandlers.GET).toBeUndefined()
  })
})
