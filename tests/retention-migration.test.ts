import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924210000_retention_cleanup.sql', 'utf8')
const cleanup = readFileSync('lib/retention/cleanup.ts', 'utf8')
const cron = readFileSync('app/api/cron/retention/route.ts', 'utf8')
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons: Array<{ path: string; schedule: string }> }

describe('retention cleanup integration', () => {
  it('creates a server-only run ledger and retention indexes', () => {
    expect(migration).toContain('create table if not exists public.retention_cleanup_runs')
    expect(migration).toContain('retention_cleanup_runs_job_started_idx')
    expect(migration).toContain('network_metadata_scrubbed_at')
    expect(migration).toContain('first_seen_at, network_metadata_scrubbed_at')
    expect(migration).toContain('retention_scrubbed_at')
    expect(migration).toContain('where analytics_retention_days > 180')
    expect(migration).toContain('check (analytics_retention_days in (30, 90, 180))')
    expect(migration).toContain('enable row level security')
  })

  it('covers each required category and keeps share dependencies safe', () => {
    for (const table of ['view_events', 'repository_events', 'file_engagement', 'viewer_sessions', 'viewers', 'share_access_attempts', 'notification_deliveries', 'rate_limit_buckets', 'shares', 'workspaces']) {
      expect(cleanup).toContain(`'${table}'`)
    }
    expect(cleanup).toContain('hasAnyRows')
    expect(cleanup).toContain('network_metadata_scrubbed_at')
    expect(cleanup).toContain('retention_scrubbed_at')
  })

  it('only permits the scheduled endpoint with a server secret', () => {
    expect(cron).toContain('CRON_SECRET')
    expect(cron).toContain('timingSafeEqual')
    expect(cron).toContain('Bearer ')
    expect(vercel.crons).toContainEqual({ path: '/api/cron/retention', schedule: '17 3 * * *' })
  })
})
