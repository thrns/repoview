import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260924170000_transactional_email_delivery.sql', import.meta.url), 'utf8')
const hardeningMigration = readFileSync(new URL('../supabase/migrations/20260924300000_notification_delivery_hardening.sql', import.meta.url), 'utf8')

describe('transactional email delivery migration', () => {
  it('adds the durable delivery and retry fields', () => {
    for (const field of ['recipient', 'attempt_count', 'provider_message_id', 'last_error', 'next_retry_at']) {
      expect(migration).toContain(field)
    }
    expect(migration).toContain('notification_deliveries_idempotency_key_idx')
    expect(migration).toContain('notification_deliveries_status_check')
    expect(migration).toContain("status in ('pending', 'retryable', 'processing')")
  })

  it('adds fail-closed pre-send revalidation and provider outcome states', () => {
    for (const field of ['outbound_attempt_key', 'outbound_attempt_started_at', 'cancelled', 'provider_result_unknown']) {
      expect(hardeningMigration).toContain(field)
    }
    for (const trigger of ['shares_cancel_notification_deliveries', 'notification_settings_cancel_deliveries', 'workspaces_cancel_notification_deliveries']) {
      expect(hardeningMigration).toContain(trigger)
    }
    for (const check of ['status = \'active\'', 'email_verified', 'destination_email', 'revoked_at', 'is_probable_bot', 'ended_at', 'installations.status = \'active\'']) {
      expect(hardeningMigration).toContain(check)
    }
    expect(hardeningMigration).toContain('claim_notification_delivery')
    expect(hardeningMigration).toContain('Provider result requires reconciliation.')
    expect(hardeningMigration).toContain('status in (\'pending\', \'retryable\')')
  })
})
