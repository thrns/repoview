export const RETENTION_DAYS = {
  repositoryViewEvents: 180,
  fileEngagement: 180,
  viewerSessions: 180,
  persistentViewerIdentifiers: 180,
  networkLocationMetadata: 90,
  shareAccessAttempts: 90,
  notificationDeliveryLogs: 180,
  revokedExpiredShareMetadata: 30,
  deletedAccountsWorkspaces: 30,
  securityAuditLogs: 90,
  systemAdminAuditLogs: 365,
  githubWebhookDeliveries: 180,
  retentionCleanupRuns: 90,
  viewerPrivacyPreferences: 365,
  accountDeletionJobs: 365,
  accountLifecycleAudit: 365,
  rateLimitBuckets: 2,
  quotaCounters: 2,
} as const

export const ANALYTICS_RETENTION_OPTIONS = [30, 90, 180] as const
export const RETENTION_BATCH_SIZE = 100
export const RETENTION_MAX_BATCHES_PER_CATEGORY = 5

/**
 * Every persistent table has an explicit lifecycle policy. Tenant tables are
 * removed by account/workspace deletion, while server-only ledgers have a
 * bounded time or expiry policy below. Analytics tables use the workspace
 * owner's selected retention option instead of these fixed periods.
 */
export const RETENTION_RULES = {
  profiles: { strategy: 'account-lifecycle' },
  workspaces: { strategy: 'account-lifecycle' },
  workspace_members: { strategy: 'account-lifecycle' },
  notification_settings: { strategy: 'account-lifecycle' },
  github_installations: { strategy: 'account-lifecycle' },
  repositories: { strategy: 'account-lifecycle' },
  shares: { strategy: 'revoked-expired-share', days: RETENTION_DAYS.revokedExpiredShareMetadata },
  share_recipients: { strategy: 'share-lifecycle' },
  viewers: { strategy: 'analytics', days: 'workspace-selected' },
  viewer_sessions: { strategy: 'analytics', days: 'workspace-selected' },
  view_events: { strategy: 'analytics', days: 'workspace-selected' },
  repository_events: { strategy: 'analytics', days: 'workspace-selected' },
  file_engagement: { strategy: 'analytics', days: 'workspace-selected' },
  share_access_attempts: { strategy: 'time', timestampColumn: 'created_at', days: RETENTION_DAYS.shareAccessAttempts },
  notification_deliveries: { strategy: 'analytics-dependency', timestampColumn: 'created_at', days: RETENTION_DAYS.notificationDeliveryLogs },
  audit_logs: { strategy: 'time', timestampColumn: 'created_at', days: RETENTION_DAYS.securityAuditLogs },
  github_connection_transactions: { strategy: 'expiry', timestampColumn: 'expires_at' },
  github_webhook_deliveries: { strategy: 'time', timestampColumn: 'received_at', days: RETENTION_DAYS.githubWebhookDeliveries },
  viewer_privacy_preferences: { strategy: 'time', timestampColumn: 'updated_at', days: RETENTION_DAYS.viewerPrivacyPreferences },
  rate_limit_buckets: { strategy: 'time', timestampColumn: 'updated_at', days: RETENTION_DAYS.rateLimitBuckets },
  quota_counters: { strategy: 'time', timestampColumn: 'updated_at', days: RETENTION_DAYS.quotaCounters },
  quota_resource_reservations: { strategy: 'expiry', timestampColumn: 'expires_at' },
  account_step_up_confirmations: { strategy: 'expiry', timestampColumn: 'expires_at' },
  retention_cleanup_runs: { strategy: 'time', timestampColumn: 'completed_at', days: RETENTION_DAYS.retentionCleanupRuns },
  account_deletion_jobs: { strategy: 'lifecycle-ledger', timestampColumn: 'updated_at', days: RETENTION_DAYS.accountDeletionJobs, preserveStatuses: ['queued', 'running', 'failed'] },
  account_lifecycle_audit: { strategy: 'lifecycle-ledger', timestampColumn: 'updated_at', days: RETENTION_DAYS.accountLifecycleAudit, preserveStatuses: ['requested', 'running', 'failed'] },
  system_admins: { strategy: 'operator-managed' },
  system_admin_audit_logs: { strategy: 'time', timestampColumn: 'created_at', days: RETENTION_DAYS.systemAdminAuditLogs },
} as const

export type RetentionDays = (typeof RETENTION_DAYS)[keyof typeof RETENTION_DAYS]

export function getRetentionCutoff(now: Date | string | number, days: number) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime()
  if (!Number.isFinite(timestamp)) throw new Error('Invalid retention reference time.')
  return new Date(timestamp - days * 24 * 60 * 60 * 1000)
}

export function isOlderThanRetention(value: Date | string | number, cutoff: Date) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp < cutoff.getTime()
}

export function normalizeAnalyticsRetentionDays(value: number | null | undefined) {
  return ANALYTICS_RETENTION_OPTIONS.includes(value as (typeof ANALYTICS_RETENTION_OPTIONS)[number])
    ? value as (typeof ANALYTICS_RETENTION_OPTIONS)[number]
    : RETENTION_DAYS.repositoryViewEvents
}
