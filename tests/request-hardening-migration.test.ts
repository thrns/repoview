import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260924310000_request_hardening.sql'), 'utf8')

describe('request hardening migration', () => {
  it('protects finite resource creation with service-only reservations and an advisory lock', () => {
    expect(migration).toContain('create table if not exists public.quota_resource_reservations')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('reserve_workspace_resource_quota')
    expect(migration).toContain('revoke all on table public.quota_resource_reservations from anon, authenticated')
  })

  it('adds durable client event identity and uniqueness before accepting replays', () => {
    expect(migration).toContain('alter table public.view_events add column if not exists event_id uuid')
    expect(migration).toContain('create unique index if not exists view_events_event_id_key')
    expect(migration).toContain('new.event_id')
  })
})
