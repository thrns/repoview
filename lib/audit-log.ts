import 'server-only'

import { createSupabaseAdminClient } from './supabase/admin'
import type { Json } from './supabase/database.types'

export const AUDIT_ACTIONS = {
  repositoryConnected: 'repository_connected',
  repositoryDisconnected: 'repository_disconnected',
  repositoryEnabled: 'repository_enabled',
  repositoryDisabled: 'repository_disabled',
  visibilityRulesChanged: 'visibility_rules_changed',
  shareCreated: 'share_created',
  shareRevoked: 'share_revoked',
  shareRotated: 'share_rotated',
  shareExpiryChanged: 'share_expiry_changed',
  githubInstallationConnected: 'github_installation_connected',
  githubInstallationDisconnected: 'github_installation_disconnected',
  githubInstallationSuspended: 'github_installation_suspended',
  githubInstallationUnsuspended: 'github_installation_unsuspended',
  notificationDestinationChanged: 'notification_destination_changed',
  notificationSettingsChanged: 'notification_settings_changed',
  accountSettingChanged: 'account_setting_changed',
  securitySettingChanged: 'security_setting_changed',
  accountExportRequested: 'account_export_requested',
  accountExportSucceeded: 'account_export_succeeded',
  accountExportFailed: 'account_export_failed',
  accountDeletionRequested: 'account_deletion_requested',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS] | string
export type AuditResourceType = 'repository' | 'share' | 'github_installation' | 'notification_settings' | 'account' | 'security' | string

export type RecordAuditLogInput = {
  workspaceId: string
  actorUserId?: string | null
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string | null
  metadata?: Record<string, unknown>
}

export class AuditLogError extends Error {
  constructor(message = 'RepoView could not record workspace activity.') {
    super(message)
    this.name = 'AuditLogError'
  }
}

/**
 * Write a workspace audit event with an explicit tenant and actor binding.
 * This module is server-only and deliberately uses the service client because
 * audit rows are system-owned; the membership check prevents accidental
 * cross-tenant actor attribution by callers.
 */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  admin = createSupabaseAdminClient(),
) {
  if (!input.workspaceId || !input.action || !input.resourceType) {
    throw new AuditLogError('RepoView received an incomplete workspace audit event.')
  }

  if (input.actorUserId) {
    const { data: membership, error: membershipError } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('workspace_id', input.workspaceId)
      .eq('user_id', input.actorUserId)
      .maybeSingle()

    if (membershipError || !membership) {
      throw new AuditLogError('RepoView could not verify the workspace audit actor.')
    }
  }

  const { error } = await admin
    .from('audit_logs')
    .insert({
      workspace_id: input.workspaceId,
      actor_user_id: input.actorUserId ?? null,
      // Keep legacy SQL/export consumers working until the old column is
      // removed in a later schema cleanup.
      actor_id: input.actorUserId ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? {}),
    })

  if (error) throw new AuditLogError()
}

/**
 * Owner mutations should not be rolled back after their primary write only
 * because an audit insert is temporarily unavailable. The failure is surfaced
 * to server logs while the caller keeps the tenant-scoped mutation result.
 */
export async function recordAuditLogBestEffort(
  input: RecordAuditLogInput,
  admin?: ReturnType<typeof createSupabaseAdminClient>,
) {
  try {
    await recordAuditLog(input, admin ?? createSupabaseAdminClient())
    return true
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') console.error('RepoView audit log write failed', error)
    return false
  }
}

/**
 * Audit metadata is an allow-by-default JSON summary, never a credential or a
 * copy of repository content. Sensitive key names are stripped recursively and
 * scalar/object sizes are bounded so audit rows remain useful and cheap.
 */
export function sanitizeAuditMetadata(input: Record<string, unknown>): Json {
  return sanitizeValue(input, 0)
}

const blockedKeyPattern = /(secret|token|password|private.?key|access.?token|authorization|cookie|raw.?body|source|content|credential|verifier)/i
const MAX_DEPTH = 3
const MAX_OBJECT_KEYS = 40
const MAX_ARRAY_ITEMS = 20
const MAX_STRING_LENGTH = 500

function sanitizeValue(value: unknown, depth: number): Json {
  if (value === null) return null
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (depth >= MAX_DEPTH) return '[redacted]'

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => sanitizeValue(entry, depth + 1))
  }

  if (typeof value === 'object') {
    const result: Record<string, Json> = {}
    for (const [key, entry] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      if (blockedKeyPattern.test(key)) continue
      result[key.slice(0, 80)] = sanitizeValue(entry, depth + 1)
    }
    return result
  }

  return null
}
