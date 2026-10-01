import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260930200000_notification_deliveries_idempotency_index.sql', import.meta.url), 'utf8')

describe('notification idempotency index migration', () => {
  it('replaces the partial index with a normal unique index matching the queue conflict target', () => {
    expect(migration).toContain('DROP INDEX IF EXISTS public.notification_deliveries_idempotency_key_idx')

    const createIndex = migration.match(/CREATE UNIQUE INDEX notification_deliveries_idempotency_key_idx[\s\S]*?;/i)?.[0]
    expect(createIndex).toMatch(/ON public\.notification_deliveries\s*\(idempotency_key\)/i)
    expect(createIndex).not.toMatch(/\bwhere\b/i)
  })
})
