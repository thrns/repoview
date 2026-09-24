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
  rateLimitBuckets: 2,
} as const

export const ANALYTICS_RETENTION_OPTIONS = [30, 90, 180] as const
export const RETENTION_BATCH_SIZE = 100
export const RETENTION_MAX_BATCHES_PER_CATEGORY = 5

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
