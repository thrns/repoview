'use server'

import { requireWorkspaceAdmin } from '../../../../lib/auth/workspace'
import { getServerEnv } from '../../../../lib/env/server'
import { sendSmtpEmail } from '../../../../lib/notifications/smtp'
import type { Tables } from '../../../../lib/supabase/database.types'

export async function sendTestEmail() {
  const context = await requireWorkspaceAdmin()

  try {
    const env = getServerEnv()
    let recipient = env.NOTIFICATION_TO_EMAIL
    const { createSupabaseServerClient } = await import('../../../../lib/supabase/server')
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('notification_settings')
      .select('notification_email')
      .eq('workspace_id', context.workspace.id)
      .maybeSingle()
    recipient = (data as Tables<'notification_settings'> | null)?.notification_email ?? recipient
    await sendSmtpEmail({
      to: recipient,
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
