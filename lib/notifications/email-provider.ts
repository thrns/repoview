import 'server-only'

import { getServerEnv } from '../env/server'
import { sendSmtpEmail, SmtpTransportError, type SmtpMessage } from './smtp'

export type TransactionalEmail = SmtpMessage

export type TransactionalEmailResult = {
  provider: 'smtp' | 'resend' | 'postmark'
  providerMessageId: string | null
}

export class TransactionalEmailProviderError extends Error {
  readonly retryable: boolean
  readonly provider: TransactionalEmailResult['provider']

  constructor(provider: TransactionalEmailResult['provider'], retryable: boolean, message = 'Transactional email delivery failed.') {
    super(message)
    this.name = 'TransactionalEmailProviderError'
    this.provider = provider
    this.retryable = retryable
  }
}

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<TransactionalEmailResult> {
  const env = getServerEnv()
  if (env.EMAIL_PROVIDER === 'smtp') {
    try {
      const result = await sendSmtpEmail(message)
      return { provider: 'smtp', providerMessageId: typeof result.messageId === 'string' ? result.messageId : null }
    } catch (error) {
      if (error instanceof SmtpTransportError) throw new TransactionalEmailProviderError('smtp', error.retryable)
      throw new TransactionalEmailProviderError('smtp', true)
    }
  }

  if (env.EMAIL_PROVIDER === 'resend') {
    return sendResendEmail(message, env.RESEND_API_KEY!, env.EMAIL_FROM!)
  }

  return sendPostmarkEmail(message, env.POSTMARK_SERVER_TOKEN!, env.EMAIL_FROM!, env.POSTMARK_MESSAGE_STREAM)
}

async function sendResendEmail(message: TransactionalEmail, apiKey: string, from: string): Promise<TransactionalEmailResult> {
  let response: Response
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, ...(message.html ? { html: message.html } : {}) }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new TransactionalEmailProviderError('resend', true)
  }
  if (!response.ok) throw new TransactionalEmailProviderError('resend', isRetryableHttpStatus(response.status))
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
  if (!response.ok) throw new TransactionalEmailProviderError('postmark', isRetryableHttpStatus(response.status))
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
