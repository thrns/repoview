import 'server-only'

import { getServerEnv } from '../env/server'
import { sendSmtpEmail, SmtpTransportError, type SmtpMessage } from './smtp'

export type TransactionalEmail = SmtpMessage

export type TransactionalEmailResult = {
  provider: 'smtp' | 'resend' | 'postmark'
  providerMessageId: string | null
}

export type TransactionalEmailOptions = {
  idempotencyKey?: string
}

export class TransactionalEmailProviderError extends Error {
  readonly retryable: boolean
  readonly provider: TransactionalEmailResult['provider']
  readonly outcomeUnknown: boolean

  constructor(provider: TransactionalEmailResult['provider'], retryable: boolean, message = 'Transactional email delivery failed.', outcomeUnknown = false) {
    super(message)
    this.name = 'TransactionalEmailProviderError'
    this.provider = provider
    this.retryable = retryable
    this.outcomeUnknown = outcomeUnknown
  }
}

export async function sendTransactionalEmail(message: TransactionalEmail, options: TransactionalEmailOptions = {}): Promise<TransactionalEmailResult> {
  const env = getServerEnv()
  if (env.EMAIL_PROVIDER === 'smtp') {
    try {
      const result = await sendSmtpEmail(message)
      return { provider: 'smtp', providerMessageId: typeof result.messageId === 'string' ? result.messageId : null }
    } catch (error) {
      if (error instanceof SmtpTransportError) throw new TransactionalEmailProviderError('smtp', error.retryable, undefined, error.outcomeUnknown)
      throw new TransactionalEmailProviderError('smtp', true, undefined, true)
    }
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    return sendResendEmail(message, env.RESEND_API_KEY!, env.EMAIL_FROM!, options.idempotencyKey)
  }

  return sendPostmarkEmail(message, env.POSTMARK_SERVER_TOKEN!, env.EMAIL_FROM!, env.POSTMARK_MESSAGE_STREAM)
}

async function sendResendEmail(message: TransactionalEmail, apiKey: string, from: string, idempotencyKey?: string): Promise<TransactionalEmailResult> {
  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, ...(message.html ? { html: message.html } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new TransactionalEmailProviderError('resend', true, undefined, true)
  }
  if (!response.ok) throw new TransactionalEmailProviderError('resend', isRetryableHttpStatus(response.status), undefined, isAmbiguousHttpStatus(response.status))
  const body = await readProviderBody(response)
  return { provider: 'resend', providerMessageId: typeof body?.id === 'string' ? body.id : null }
}

async function sendPostmarkEmail(message: TransactionalEmail, serverToken: string, from: string, messageStream: string): Promise<TransactionalEmailResult> {
  let response: Response
  try {
    response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': serverToken },
      body: JSON.stringify({ From: from, To: message.to, Subject: message.subject, TextBody: message.text, ...(message.html ? { HtmlBody: message.html } : {}), MessageStream: messageStream }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new TransactionalEmailProviderError('postmark', true)
  }
  if (!response.ok) throw new TransactionalEmailProviderError('postmark', isRetryableHttpStatus(response.status), undefined, isAmbiguousHttpStatus(response.status))
  const body = await readProviderBody(response)
  return { provider: 'postmark', providerMessageId: typeof body?.MessageID === 'string' ? body.MessageID : null }
}

async function readProviderBody(response: Response) {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

function isAmbiguousHttpStatus(status: number) {
  // A timeout or provider 5xx can occur after the provider accepted the
  // request. Do not turn those responses into an automatic duplicate send.
  return status === 408 || status >= 500
}
