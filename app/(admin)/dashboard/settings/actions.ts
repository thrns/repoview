'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireWorkspace, requireWorkspaceAdmin } from '../../../../lib/auth/workspace'
import { getServerEnv } from '../../../../lib/env/server'
import { sendTransactionalEmail } from '../../../../lib/notifications/email-provider'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { enforceAuthenticatedRateLimit, enforceRateLimits } from '../../../../lib/security/rate-limit'
import { AUDIT_ACTIONS, recordAuditLogBestEffort } from '../../../../lib/audit-log'

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
})

const notificationSettingsSchema = z.object({
  notificationEmail: z.union([z.string().trim().email().max(320), z.literal('')]),
  notifyOnView: z.boolean(),
  notifyOnReturningView: z.boolean(),
  notifyOnDownload: z.boolean(),
  notifyOnSessionSummary: z.boolean(),
  notifyOnSecurityAlert: z.boolean(),
  digestFrequency: z.enum(['off', 'daily', 'weekly']),
  analyticsEnabled: z.boolean(),
  analyticsRetentionDays: z.union([z.literal(30), z.literal(90), z.literal(180)]),
})

const uuidSchema = z.string().uuid()

export async function updateProfile(input: { fullName: string }) {
  const parsed = profileSchema.parse(input)
  const context = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.fullName })
    .eq('id', context.user.id)

  if (error) return { saved: false as const, error: 'Your profile could not be saved.' }
  await recordAuditLogBestEffort({
    workspaceId: context.workspace.id,
    actorUserId: context.user.id,
    action: AUDIT_ACTIONS.accountSettingChanged,
    resourceType: 'account',
    resourceId: context.user.id,
    metadata: { setting: 'profile', fields: ['full_name'] },
  })
  revalidatePath('/dashboard/settings')
  return { saved: true as const }
}

export async function updateNotificationSettings(input: {
  notificationEmail: string
  notifyOnView: boolean
  notifyOnReturningView: boolean
  notifyOnDownload: boolean
  notifyOnSessionSummary: boolean
  notifyOnSecurityAlert: boolean
  digestFrequency: 'off' | 'daily' | 'weekly'
  analyticsEnabled: boolean
  analyticsRetentionDays: 30 | 90 | 180
}) {
  const parsed = notificationSettingsSchema.parse(input)
  const context = await requireWorkspaceAdmin()
  const supabase = await createSupabaseServerClient()
  const destinationEmail = parsed.notificationEmail || null
  const { data: currentSettings, error: currentSettingsError } = await supabase
    .from('notification_settings')
    .select('destination_email, email_verified')
    .eq('workspace_id', context.workspace.id)
    .maybeSingle()

  if (currentSettingsError) return { saved: false as const, error: 'Notification settings could not be saved.' }

  const accountEmail = context.user.email?.trim().toLowerCase()
  const isVerifiedAccountDestination = Boolean(
    destinationEmail
    && context.user.email_confirmed_at
    && accountEmail
    && destinationEmail.toLowerCase() === accountEmail,
  )
  const emailVerified = Boolean(
    destinationEmail
    && ((currentSettings?.email_verified && currentSettings.destination_email?.toLowerCase() === destinationEmail.toLowerCase()) || isVerifiedAccountDestination),
  )
  const destinationChanged = (currentSettings?.destination_email ?? null)?.toLowerCase() !== (destinationEmail ?? null)?.toLowerCase()
  const { error } = await supabase
    .from('notification_settings')
    .upsert({
      workspace_id: context.workspace.id,
      destination_email: destinationEmail,
      email_verified: emailVerified,
      view_opened: parsed.notifyOnView,
      returning_view: parsed.notifyOnReturningView,
      download: parsed.notifyOnDownload,
      session_summary: parsed.notifyOnSessionSummary,
      security_alerts: parsed.notifyOnSecurityAlert,
      digest_frequency: parsed.digestFrequency,
      analytics_enabled: parsed.analyticsEnabled,
      analytics_retention_days: parsed.analyticsRetentionDays,
    }, { onConflict: 'workspace_id' })

  if (error) return { saved: false as const, error: 'Notification settings could not be saved.' }
  await recordAuditLogBestEffort({
    workspaceId: context.workspace.id,
    actorUserId: context.user.id,
    action: destinationChanged ? AUDIT_ACTIONS.notificationDestinationChanged : AUDIT_ACTIONS.notificationSettingsChanged,
    resourceType: 'notification_settings',
    resourceId: context.workspace.id,
    metadata: destinationChanged
      ? { configured: Boolean(destinationEmail), verified: emailVerified }
      : { setting: 'notification_preferences' },
  })
  revalidatePath('/dashboard/settings')
  return { saved: true as const }
}

export async function disconnectGitHubInstallation(installationId: string) {
  const parsedInstallationId = uuidSchema.parse(installationId)
  const context = await requireWorkspaceAdmin()
  await enforceAuthenticatedRateLimit('authenticated-github-connect', context.workspace.id, context.user.id)
  await enforceRateLimits('authenticated-github-connect', [{ value: `installation:${parsedInstallationId}` }])
  const supabase = await createSupabaseServerClient()
  const { data: installation, error: installationLookupError } = await supabase
    .from('github_installations')
    .select('id')
    .eq('id', parsedInstallationId)
    .eq('workspace_id', context.workspace.id)
    .maybeSingle()

  if (installationLookupError || !installation) {
    return { disconnected: false as const, error: 'That GitHub connection is no longer available.' }
  }

  const now = new Date().toISOString()
  const { data: repositories, error: repositoryLookupError } = await supabase
    .from('repositories')
    .select('id')
    .eq('workspace_id', context.workspace.id)
    .eq('github_installation_id', installation.id)
  if (repositoryLookupError) return { disconnected: false as const, error: 'Repository access could not be closed.' }

  const { error: installationError } = await supabase
    .from('github_installations')
    .update({ status: 'deleted', suspended_at: null })
    .eq('id', installation.id)
    .eq('workspace_id', context.workspace.id)
  if (installationError) return { disconnected: false as const, error: 'The GitHub connection could not be disconnected.' }

  const { error: repositoryError } = await supabase
    .from('repositories')
    .update({ enabled: false })
    .eq('workspace_id', context.workspace.id)
    .eq('github_installation_id', installation.id)
  if (repositoryError) return { disconnected: false as const, error: 'Repository access could not be closed.' }

  if (repositories.length > 0) {
    const { error: shareError } = await supabase
      .from('shares')
      .update({ revoked_at: now })
      .eq('workspace_id', context.workspace.id)
      .is('revoked_at', null)
      .in('repository_id', repositories.map((repository) => repository.id))
    if (shareError) return { disconnected: false as const, error: 'Repository shares could not be revoked.' }
  }

  await Promise.all(repositories.map((repository) => recordAuditLogBestEffort({
    workspaceId: context.workspace.id,
    actorUserId: context.user.id,
    action: AUDIT_ACTIONS.repositoryDisconnected,
    resourceType: 'repository',
    resourceId: repository.id,
    metadata: { github_installation_id: installation.id },
  })))

  await recordAuditLogBestEffort({
    workspaceId: context.workspace.id,
    actorUserId: context.user.id,
    action: AUDIT_ACTIONS.githubInstallationDisconnected,
    resourceType: 'github_installation',
    resourceId: installation.id,
    metadata: { repository_count: repositories.length },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/repositories')
  revalidatePath('/dashboard/shares')
  return { disconnected: true as const }
}

export async function changePassword(input: { password: string }) {
  const password = z.string().min(8).max(200).parse(input.password)
  const context = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { changed: false as const, error: 'The password could not be changed.' }
  await recordAuditLogBestEffort({
    workspaceId: context.workspace.id,
    actorUserId: context.user.id,
    action: AUDIT_ACTIONS.securitySettingChanged,
    resourceType: 'security',
    resourceId: context.user.id,
    metadata: { setting: 'password' },
  })
  return { changed: true as const }
}

export async function sendTestEmail() {
  const context = await requireWorkspaceAdmin()
  await enforceAuthenticatedRateLimit('authenticated-test-email', context.workspace.id, context.user.id)

  try {
    const env = getServerEnv()
    const destination = env.OPERATOR_EMAIL ?? (env.EMAIL_PROVIDER === 'smtp' ? env.SMTP_USER : undefined)
    if (!destination) return { sent: false as const, error: 'The test email could not be sent.' }
    await sendTransactionalEmail({
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
    return { sent: true as const }
  } catch {
    return { sent: false as const, error: 'The test email could not be sent.' }
  }
}
