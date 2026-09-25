import { describe, expect, it } from 'vitest'

import { getRetentionCutoff, isOlderThanRetention, RETENTION_DAYS, RETENTION_RULES } from '../lib/retention-policy'
import { PRIVACY_MARKDOWN } from '../lib/legal-content'

describe('retention policy', () => {
  it('uses exact UTC boundaries without deleting data at the boundary', () => {
    const now = new Date('2026-09-24T12:00:00.000Z')
    const cutoff = getRetentionCutoff(now, RETENTION_DAYS.repositoryViewEvents)

    expect(cutoff.toISOString()).toBe('2026-03-28T12:00:00.000Z')
    expect(isOlderThanRetention(cutoff, cutoff)).toBe(false)
    expect(isOlderThanRetention(new Date(cutoff.getTime() - 1), cutoff)).toBe(true)
  })

  it('keeps shorter network/location retention separate from engagement retention', () => {
    expect(RETENTION_DAYS.networkLocationMetadata).toBe(90)
    expect(RETENTION_DAYS.repositoryViewEvents).toBe(180)
    expect(RETENTION_DAYS.networkLocationMetadata).toBeLessThan(RETENTION_DAYS.repositoryViewEvents)
  })

  it('renders the same central periods in the Privacy Policy', () => {
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.repositoryViewEvents} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.networkLocationMetadata} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.notificationDeliveryLogs} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.revokedExpiredShareMetadata} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.rateLimitBuckets} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.quotaCounters} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.githubWebhookDeliveries} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.retentionCleanupRuns} days`)
    expect(PRIVACY_MARKDOWN).toContain(`${RETENTION_DAYS.accountLifecycleAudit} days`)
  })

  it('defines bounded policies for server-only ledgers and expiry state', () => {
    expect(RETENTION_RULES.github_webhook_deliveries).toMatchObject({ timestampColumn: 'received_at', days: 180 })
    expect(RETENTION_RULES.github_connection_transactions).toMatchObject({ strategy: 'expiry', timestampColumn: 'expires_at' })
    expect(RETENTION_RULES.retention_cleanup_runs).toMatchObject({ timestampColumn: 'completed_at', days: 90 })
    expect(RETENTION_RULES.account_step_up_confirmations.strategy).toBe('expiry')
    expect(RETENTION_RULES.account_lifecycle_audit).toMatchObject({ timestampColumn: 'updated_at', days: 365 })
  })

  it('keeps selected analytics retention independent of the fixed notification log period', () => {
    expect(RETENTION_RULES.notification_deliveries.strategy).toBe('analytics-dependency')
    expect(RETENTION_RULES.notification_deliveries.days).toBe(RETENTION_DAYS.notificationDeliveryLogs)
    expect(RETENTION_RULES.viewer_sessions.days).toBe('workspace-selected')
  })
})
