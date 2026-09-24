import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/env/server', () => ({
  getServerEnv: vi.fn(() => ({
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 465,
    SMTP_USER: 'owner@example.com',
    SMTP_APP_PASSWORD: 'app-password-secret',
    SMTP_FROM_NAME: 'RepoView',
  })),
}))
vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}))

import nodemailer from 'nodemailer'
import { getSmtpTransport, sendSmtpEmail, SmtpTransportError } from '../lib/notifications/smtp'

const createTransport = vi.mocked(nodemailer.createTransport)

beforeEach(() => {
  createTransport.mockReturnValue({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'message-1' }),
  } as never)
})

describe('SMTP transport', () => {
  it('configures Gmail over TLS with server-only credentials and sends a message', async () => {
    const result = await sendSmtpEmail({
      to: 'owner@example.com',
      subject: 'RepoView test',
      text: 'Test message',
    })

    expect(result).toEqual({ messageId: 'message-1' })
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'owner@example.com', pass: 'app-password-secret' },
    }))
    expect(getSmtpTransport().sendMail).toHaveBeenCalledWith({
      from: 'RepoView <owner@example.com>',
      to: 'owner@example.com',
      subject: 'RepoView test',
      text: 'Test message',
    })
  })

  it('converts provider failures to a safe error without exposing credentials', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('secret app password leaked'))
    Object.assign(getSmtpTransport(), { sendMail })

    await expect(sendSmtpEmail({ to: 'owner@example.com', subject: 'Test', text: 'Body' }))
      .rejects.toBeInstanceOf(SmtpTransportError)
    await expect(sendSmtpEmail({ to: 'owner@example.com', subject: 'Test', text: 'Body' }))
      .rejects.not.toThrow('secret app password leaked')
  })
})
