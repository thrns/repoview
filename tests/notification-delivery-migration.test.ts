import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260924170000_transactional_email_delivery.sql', import.meta.url), 'utf8')

describe('transactional email delivery migration', () => {
  it('adds the durable delivery and retry fields', () => {
    for (const field of ['recipient', 'attempt_count', 'provider_message_id', 'last_error', 'next_retry_at']) {
      expect(migration).toContain(field)
    }
    expect(migration).toContain('notification_deliveries_idempotency_key_idx')
    expect(migration).toContain('notification_deliveries_status_check')
    expect(migration).toContain("status in ('pending', 'retryable', 'processing')")
  })
})
