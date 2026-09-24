import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import { sanitizeAuditMetadata } from '../audit-log'

export const SYSTEM_ADMIN_AUDIT_ACTIONS = {
  overviewViewed: 'system_overview_viewed',
  testEmailSent: 'operator_test_email_sent',
  workspaceStatusChanged: 'workspace_status_changed',
  userSuspended: 'user_suspended',
  userUnsuspended: 'user_unsuspended',
} as const

export type RecordSystemAdminAuditLogInput = {
  actorUserId: string
  action: string
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * System audit records intentionally have no workspace_id. Operator activity
 * must not be made to look like a customer workspace action, and metadata is
 * scrubbed with the same source/credential protections as workspace audits.
 */
export async function recordSystemAdminAuditLog(
  input: RecordSystemAdminAuditLogInput,
  admin = createSupabaseAdminClient(),
) {
  if (!input.actorUserId || !input.action || !input.resourceType) {
    throw new Error('RepoView received an incomplete system audit event.')
  }

  const { data: grant, error: grantError } = await admin
    .from('system_admins')
    .select('user_id')
    .eq('user_id', input.actorUserId)
    .eq('status', 'active')
    .maybeSingle()

  if (grantError || !grant) throw new Error('RepoView could not verify the system audit actor.')

  const { error } = await admin
    .from('system_admin_audit_logs')
    .insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? {}),
    })

  if (error) throw new Error('RepoView could not record system activity.')
}

export async function recordSystemAdminAuditLogBestEffort(
  input: RecordSystemAdminAuditLogInput,
  admin?: ReturnType<typeof createSupabaseAdminClient>,
) {
  try {
    await recordSystemAdminAuditLog(input, admin ?? createSupabaseAdminClient())
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') console.error('RepoView system audit log write failed', error)
    return false
  }
}
