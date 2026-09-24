import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260924130000_github_webhooks.sql', 'utf8')

describe('GitHub webhook migration', () => {
  it('creates a server-only delivery ledger keyed by GitHub delivery id', () => {
    expect(migration).toContain('create table public.github_webhook_deliveries')
    expect(migration).toContain('delivery_id text primary key')
    expect(migration).toContain('event text not null')
    expect(migration).toContain('action text not null')
    expect(migration).toContain('installation_id bigint')
    expect(migration).toContain('received_at timestamptz')
    expect(migration).toContain('processed_at timestamptz')
    expect(migration).toContain('error text')
    expect(migration).toContain('alter table public.github_webhook_deliveries enable row level security')
    expect(migration).toContain('X-GitHub-Delivery')
  })
})
