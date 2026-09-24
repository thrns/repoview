import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260921200000_initial_schema.sql'), 'utf8')

describe('initial Supabase migration', () => {
  it('defines the documented private-sharing tables and indexes', () => {
    for (const table of ['repositories', 'shares', 'viewer_sessions', 'view_events', 'notification_deliveries']) {
      expect(migration).toContain(`create table public.${table}`)
    }
    expect(migration).toContain('token_hash text not null unique')
    expect(migration).toContain('session_token_hash text not null unique')
    expect(migration).toContain('view_events_share_created_idx')
  })

  it('enables RLS on every public application table without anonymous policies', () => {
    for (const table of ['repositories', 'shares', 'viewer_sessions', 'view_events', 'notification_deliveries']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
    expect(migration).not.toMatch(/create\s+policy/i)
  })
})
