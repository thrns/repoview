import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/require-admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn(() => ({ NOTIFICATION_TO_EMAIL: 'owner@example.com' })) }))
vi.mock('../lib/notifications/smtp', () => ({ sendSmtpEmail: vi.fn() }))

import { sendTestEmail } from '../app/(admin)/dashboard/settings/actions'
import { requireAdmin } from '../lib/auth/require-admin'
import { sendSmtpEmail } from '../lib/notifications/smtp'

const requireAdminMock = vi.mocked(requireAdmin)
const sendEmail = vi.mocked(sendSmtpEmail)

beforeEach(() => {
  requireAdminMock.mockResolvedValue({ id: 'admin' } as never)
  sendEmail.mockReset()
  sendEmail.mockResolvedValue({ messageId: 'message-1' } as never)
})

describe('send test email action', () => {
  it('requires admin access and returns only a safe success result', async () => {
    await expect(sendTestEmail()).resolves.toEqual({ sent: true })
    expect(requireAdminMock).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      subject: 'RepoView: SMTP test email',
    }))
  })

  it('returns a generic failure without leaking provider errors', async () => {
    sendEmail.mockRejectedValue(new Error('app-password-secret'))

    await expect(sendTestEmail()).resolves.toEqual({ sent: false, error: 'The test email could not be sent.' })
  })

  it('does not send when admin authorization fails', async () => {
    requireAdminMock.mockRejectedValue(new Error('forbidden'))

    await expect(sendTestEmail()).rejects.toThrow('forbidden')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
