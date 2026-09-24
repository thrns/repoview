'use server'

import { requireAdmin } from '../../../../lib/auth/require-admin'
import { getServerEnv } from '../../../../lib/env/server'
import { sendSmtpEmail } from '../../../../lib/notifications/smtp'

export async function sendTestEmail() {
  await requireAdmin()

  try {
    const env = getServerEnv()
    await sendSmtpEmail({
      to: env.NOTIFICATION_TO_EMAIL,
      subject: 'RepoView: SMTP test email',
      text: [
        'RepoView',
        '',
        'This is a test email from the configured RepoView Gmail SMTP transport.',
        `Sent: ${new Date().toISOString()}`,
      ].join('\n'),
      html: '<p><strong>RepoView</strong></p><p>This is a test email from the configured RepoView Gmail SMTP transport.</p>',
    })
    return { sent: true as const }
  } catch {
    return { sent: false as const, error: 'The test email could not be sent.' }
  }
}
