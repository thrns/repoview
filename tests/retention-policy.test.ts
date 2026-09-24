import { describe, expect, it } from 'vitest'

import { getRetentionCutoff, isOlderThanRetention, RETENTION_DAYS } from '../lib/retention-policy'
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
  })
})
