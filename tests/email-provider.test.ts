import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/env/server', () => ({ getServerEnv: vi.fn() }))
vi.mock('../lib/notifications/smtp', () => ({ sendSmtpEmail: vi.fn(), SmtpTransportError: class SmtpTransportError extends Error {} }))

import { getServerEnv } from '../lib/env/server'
import { sendTransactionalEmail } from '../lib/notifications/email-provider'

const getEnv = vi.mocked(getServerEnv)
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('transactional email providers', () => {
  it('sends through Resend without changing notification callers', async () => {
    getEnv.mockReturnValue({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'resend-secret', EMAIL_FROM: 'notifications@example.com' } as never)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'resend-message-1' }), { status: 200 }))

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }))
      .resolves.toEqual({ provider: 'resend', providerMessageId: 'resend-message-1' })
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer resend-secret' }),
    }))
  })

  it('treats provider throttling as retryable', async () => {
    getEnv.mockReturnValue({ EMAIL_PROVIDER: 'postmark', POSTMARK_SERVER_TOKEN: 'postmark-secret', EMAIL_FROM: 'notifications@example.com', POSTMARK_MESSAGE_STREAM: 'outbound' } as never)
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }))

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }))
      .rejects.toMatchObject({ provider: 'postmark', retryable: true })
  })
})
