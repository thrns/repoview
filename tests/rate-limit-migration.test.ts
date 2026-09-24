import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924220000_rate_limiting.sql', 'utf8')

describe('rate limiting migration', () => {
  it('uses a service-only bucket table and an atomic security-definer function', () => {
    expect(migration).toContain('create table if not exists public.rate_limit_buckets')
    expect(migration).toContain('create or replace function public.consume_rate_limit')
    expect(migration).toContain('security definer')
    expect(migration).toContain('set search_path = public')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('alter table public.rate_limit_buckets enable row level security')
    expect(migration).toContain('revoke all on table public.rate_limit_buckets from anon, authenticated')
    expect(migration).toContain('grant execute on function public.consume_rate_limit')
  })

  it('keeps the bucket key opaque and indexed for scheduled cleanup', () => {
    expect(migration).toContain('key_hash text primary key')
    expect(migration).toContain('rate_limit_buckets_updated_idx')
  })
})
