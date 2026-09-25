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

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }, { idempotencyKey: 'outbound-attempt-1' }))
      .resolves.toEqual({ provider: 'resend', providerMessageId: 'resend-message-1' })
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer resend-secret', 'Idempotency-Key': 'outbound-attempt-1' }),
    }))
  })

  it('treats provider throttling as retryable', async () => {
    getEnv.mockReturnValue({ EMAIL_PROVIDER: 'postmark', POSTMARK_SERVER_TOKEN: 'postmark-secret', EMAIL_FROM: 'notifications@example.com', POSTMARK_MESSAGE_STREAM: 'outbound' } as never)
    fetchMock.mockResolvedValue(new Response('{}', { status: 429 }))

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }))
      .rejects.toMatchObject({ provider: 'postmark', retryable: true })
  })

  it('treats provider 5xx responses as ambiguous rather than safe retries', async () => {
    getEnv.mockReturnValue({ EMAIL_PROVIDER: 'postmark', POSTMARK_SERVER_TOKEN: 'postmark-secret', EMAIL_FROM: 'notifications@example.com', POSTMARK_MESSAGE_STREAM: 'outbound' } as never)
    fetchMock.mockResolvedValue(new Response('{}', { status: 503 }))

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }))
      .rejects.toMatchObject({ provider: 'postmark', outcomeUnknown: true })
  })

  it('marks a lost provider response as an unknown outcome', async () => {
    getEnv.mockReturnValue({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'resend-secret', EMAIL_FROM: 'notifications@example.com' } as never)
    fetchMock.mockRejectedValue(new Error('connection reset'))

    await expect(sendTransactionalEmail({ to: 'alice@example.com', subject: 'Hello', text: 'Body' }, { idempotencyKey: 'outbound-attempt-1' }))
      .rejects.toMatchObject({ provider: 'resend', retryable: true, outcomeUnknown: true })
  })
})
