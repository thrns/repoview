import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({ requireWorkspaceAdmin: vi.fn() }))
vi.mock('../lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn(() => ({ SMTP_USER: 'operator@example.com' })) }))
vi.mock('../lib/notifications/smtp', () => ({ sendSmtpEmail: vi.fn() }))

import { sendTestEmail } from '../app/(admin)/dashboard/settings/actions'
import { requireWorkspaceAdmin } from '../lib/auth/workspace'
import { sendSmtpEmail } from '../lib/notifications/smtp'

const requireWorkspaceAdminMock = vi.mocked(requireWorkspaceAdmin)
const sendEmail = vi.mocked(sendSmtpEmail)

beforeEach(() => {
  requireWorkspaceAdminMock.mockResolvedValue({ workspace: { id: 'workspace-1' } } as never)
  sendEmail.mockReset()
  sendEmail.mockResolvedValue({ messageId: 'message-1' } as never)
})

describe('send test email action', () => {
  it('requires workspace admin access and returns only a safe success result', async () => {
    await expect(sendTestEmail()).resolves.toEqual({ sent: true })
    expect(requireWorkspaceAdminMock).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'operator@example.com',
      subject: 'RepoView: SMTP test email',
    }))
  })

  it('returns a generic failure without leaking provider errors', async () => {
    sendEmail.mockRejectedValue(new Error('app-password-secret'))

    await expect(sendTestEmail()).resolves.toEqual({ sent: false, error: 'The test email could not be sent.' })
  })

  it('does not send when admin authorization fails', async () => {
    requireWorkspaceAdminMock.mockRejectedValue(new Error('forbidden'))

    await expect(sendTestEmail()).rejects.toThrow('forbidden')
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
