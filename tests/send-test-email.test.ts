import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/system-admin', () => ({ requireSystemAdmin: vi.fn() }))
vi.mock('../lib/security/rate-limit', () => ({ enforceRateLimits: vi.fn(async () => undefined) }))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn(() => ({ OPERATOR_EMAIL: 'operator@example.com' })) }))
vi.mock('../lib/notifications/email-provider', () => ({ sendTransactionalEmail: vi.fn() }))

import { sendTestEmail } from '../app/(system)/system-admin/actions'
import { requireSystemAdmin } from '../lib/auth/system-admin'
import { sendTransactionalEmail } from '../lib/notifications/email-provider'

const requireSystemAdminMock = vi.mocked(requireSystemAdmin)
const sendEmail = vi.mocked(sendTransactionalEmail)

beforeEach(() => {
  requireSystemAdminMock.mockResolvedValue({ user: { id: 'user-1' }, systemAdmin: { user_id: 'user-1', status: 'active', role: 'operator' } } as never)
  sendEmail.mockReset()
  sendEmail.mockResolvedValue({ provider: 'smtp', providerMessageId: 'message-1' } as never)
})

describe('send test email action', () => {
  it('requires system-admin access and returns only a safe success result', async () => {
    await expect(sendTestEmail()).resolves.toEqual({ sent: true })
    expect(requireSystemAdminMock).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'operator@example.com',
      subject: 'RepoView: transactional email test',
    }))
  })

  it('returns a generic failure without leaking provider errors', async () => {
    sendEmail.mockRejectedValue(new Error('app-password-secret'))

    await expect(sendTestEmail()).resolves.toEqual({ sent: false, error: 'The test email could not be sent.' })
  })

  it('does not send when admin authorization fails', async () => {
    requireSystemAdminMock.mockRejectedValue(new Error('forbidden'))

    await expect(sendTestEmail()).rejects.toThrow('forbidden')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
