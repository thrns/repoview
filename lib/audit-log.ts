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

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]
export type AuditResourceType = 'repository' | 'share' | 'github_installation' | 'notification_settings' | 'account' | 'security' | string

export type AuditMetadataField = 'string' | 'nullable-string' | 'boolean' | 'number' | 'string-array' | 'safe-code'
export type AuditMetadataSchema = Readonly<Record<string, AuditMetadataField>>

/**
 * Audit metadata is an API contract, not a general-purpose JSON sink. Keep
 * this map exhaustive so adding an action forces its storage policy to be
 * reviewed at the same time.
 */
export const AUDIT_METADATA_SCHEMAS: Record<AuditAction, AuditMetadataSchema> = {
  [AUDIT_ACTIONS.repositoryConnected]: { repository: 'string', github_repository_id: 'number' },
  [AUDIT_ACTIONS.repositoryDisconnected]: { trigger: 'string' },
  [AUDIT_ACTIONS.repositoryEnabled]: { repository: 'string' },
  [AUDIT_ACTIONS.repositoryDisabled]: { repository: 'string' },
  [AUDIT_ACTIONS.visibilityRulesChanged]: { hidden_count: 'number', allow_only_count: 'number' },
  [AUDIT_ACTIONS.shareCreated]: { repository: 'string', share_type: 'string', expires_at: 'nullable-string' },
  [AUDIT_ACTIONS.shareRevoked]: {},
  [AUDIT_ACTIONS.shareRotated]: { token_rotated: 'boolean' },
  [AUDIT_ACTIONS.shareExpiryChanged]: { expires_at: 'nullable-string' },
  [AUDIT_ACTIONS.githubInstallationConnected]: {
    account: 'string',
    account_type: 'string',
    repository_selection: 'string',
    reconnected: 'boolean',
    trigger: 'string',
  },
  [AUDIT_ACTIONS.githubInstallationDisconnected]: { account: 'string', repository_count: 'number', trigger: 'string' },
  [AUDIT_ACTIONS.githubInstallationSuspended]: { account: 'string', trigger: 'string' },
  [AUDIT_ACTIONS.githubInstallationUnsuspended]: { account: 'string', trigger: 'string' },
  [AUDIT_ACTIONS.notificationDestinationChanged]: { configured: 'boolean', verified: 'boolean' },
  [AUDIT_ACTIONS.notificationSettingsChanged]: { setting: 'string' },
  [AUDIT_ACTIONS.accountSettingChanged]: { setting: 'string', fields: 'string-array' },
  [AUDIT_ACTIONS.securitySettingChanged]: { setting: 'string' },
  [AUDIT_ACTIONS.accountExportRequested]: { format: 'string' },
  [AUDIT_ACTIONS.accountExportSucceeded]: { format: 'string' },
  [AUDIT_ACTIONS.accountExportFailed]: { reason: 'safe-code' },
  [AUDIT_ACTIONS.accountDeletionRequested]: {},
}

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
      metadata: sanitizeAuditMetadata(input.action, input.metadata ?? {}),
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
 * Keep only fields explicitly allowed for the action. Unknown fields and
 * values with the wrong shape are dropped, which prevents repository source,
 * credentials, email bodies, and arbitrary caller-provided objects from being
 * persisted even when their key names look harmless.
 */
export function sanitizeAuditMetadata(action: AuditAction, input: Record<string, unknown>): Json {
  return sanitizeMetadataWithSchema(input, AUDIT_METADATA_SCHEMAS[action] ?? {})
}

export function sanitizeMetadataWithSchema(input: Record<string, unknown>, schema: AuditMetadataSchema): Json {
  const result: Record<string, Json> = {}
  for (const [key, field] of Object.entries(schema)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue
    const sanitized = sanitizeAllowedField(input[key], field)
    if (sanitized !== undefined) result[key] = sanitized
  }
  return result
}

const MAX_STRING_LENGTH = 500

function sanitizeAllowedField(value: unknown, field: AuditMetadataField): Json | undefined {
  if (field === 'string') return typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : undefined
  if (field === 'nullable-string') {
    if (value === null) return null
    return typeof value === 'string' ? value.slice(0, MAX_STRING_LENGTH) : undefined
  }
  if (field === 'boolean') return typeof value === 'boolean' ? value : undefined
  if (field === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  if (field === 'safe-code') return typeof value === 'string' && /^[a-z0-9][a-z0-9_:-]{0,79}$/.test(value) ? value : undefined
  if (field === 'string-array') {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) return undefined
    return value.slice(0, 20).map((entry) => entry.slice(0, MAX_STRING_LENGTH))
  }
  return undefined
}
