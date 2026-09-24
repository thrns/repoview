import 'server-only'

import nodemailer, { type Transporter } from 'nodemailer'

import { getServerEnv } from '../env/server'

export type SmtpMessage = {
  to: string
  subject: string
  text: string
  html?: string
}

export class SmtpTransportError extends Error {
  readonly retryable: boolean

  constructor(retryable = true) {
    super('SMTP delivery failed.')
    this.retryable = retryable
    this.name = 'SmtpTransportError'
  }
}

function isRetryableSmtpError(error: unknown) {
  if (!error || typeof error !== 'object') return true
  const candidate = error as { responseCode?: unknown; code?: unknown }
  if (typeof candidate.responseCode === 'number') return candidate.responseCode === 408 || candidate.responseCode === 421 || candidate.responseCode >= 500
  return ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH'].includes(String(candidate.code ?? ''))
}

let transporter: Transporter | undefined

export function getSmtpTransport() {
  if (!transporter) {
    const env = getServerEnv()
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER!,
        pass: env.SMTP_APP_PASSWORD!,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { minVersion: 'TLSv1.2' },
    })
  }

  return transporter
}

export async function sendSmtpEmail(message: SmtpMessage) {
  const env = getServerEnv()
  try {
    return await getSmtpTransport().sendMail({
      from: `${env.SMTP_FROM_NAME} <${env.EMAIL_FROM ?? env.SMTP_USER!}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
  } catch (error) {
    throw new SmtpTransportError(isRetryableSmtpError(error))
  }
}
