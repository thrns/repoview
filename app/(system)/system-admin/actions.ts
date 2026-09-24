'use server'

import { getServerEnv } from '../../../lib/env/server'
import { sendTransactionalEmail } from '../../../lib/notifications/email-provider'
import { enforceRateLimits } from '../../../lib/security/rate-limit'
import { requireSystemAdmin } from '../../../lib/auth/system-admin'
import { recordSystemAdminAuditLogBestEffort, SYSTEM_ADMIN_AUDIT_ACTIONS } from '../../../lib/system-admin/audit'

export async function sendTestEmail() {
  const context = await requireSystemAdmin()
  await enforceRateLimits('authenticated-test-email', [{ value: `system-admin:${context.user.id}` }])

  try {
    const env = getServerEnv()
    const destination = env.OPERATOR_EMAIL ?? (env.EMAIL_PROVIDER === 'smtp' ? env.SMTP_USER : undefined)
    if (!destination) return { sent: false as const, error: 'The test email could not be sent.' }
    const result = await sendTransactionalEmail({
      to: destination,
      subject: 'RepoView: transactional email test',
      text: [
        'RepoView',
        '',
        'This is a test email from the configured RepoView transactional email provider.',
        `Sent: ${new Date().toISOString()}`,
      ].join('\n'),
      html: '<p><strong>RepoView</strong></p><p>This is a test email from the configured RepoView transactional email provider.</p>',
    })
    await recordSystemAdminAuditLogBestEffort({
      actorUserId: context.user.id,
      action: SYSTEM_ADMIN_AUDIT_ACTIONS.testEmailSent,
      resourceType: 'email_provider',
      metadata: { provider_message_id: result.providerMessageId },
    })
    return { sent: true as const }
  } catch {
    return { sent: false as const, error: 'The test email could not be sent.' }
  }
}
