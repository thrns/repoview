import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924210000_retention_cleanup.sql', 'utf8')
const hardeningMigration = readFileSync('supabase/migrations/20260924320000_retention_and_audit_hardening.sql', 'utf8')
const cleanup = readFileSync('lib/retention/cleanup.ts', 'utf8')
const deletionJob = readFileSync('lib/account/deletion-job.ts', 'utf8')
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
    for (const table of ['view_events', 'repository_events', 'file_engagement', 'viewer_sessions', 'viewers', 'share_access_attempts', 'notification_deliveries', 'github_webhook_deliveries', 'github_connection_transactions', 'account_step_up_confirmations', 'viewer_privacy_preferences', 'retention_cleanup_runs', 'account_deletion_jobs', 'account_lifecycle_audit', 'system_admin_audit_logs', 'rate_limit_buckets', 'quota_counters', 'quota_resource_reservations', 'shares', 'workspaces']) {
      expect(cleanup).toContain(`'${table}'`)
    }
    expect(cleanup).toContain('hasAnyRows')
    expect(cleanup).toContain('network_metadata_scrubbed_at')
    expect(cleanup).toContain('retention_scrubbed_at')
    expect(cleanup).toContain('runAccountDeletionCleanup')
    expect(deletionJob).toContain('claim_account_deletion_job')
    expect(deletionJob).toContain('ACCOUNT_DELETION_BATCH_SIZE')
    expect(cleanup).toContain(".eq('status', 'deleted')")
    expect(cleanup).toContain('deleteNotificationDeliveriesForOldSessions')
    expect(cleanup).toContain("select('delivery_id')")
    expect(cleanup).toContain(".in('delivery_id', deliveryIds)")
    expect(cleanup).not.toContain("{ table: 'notification_deliveries', column: 'session_id' }")
  })

  it('adds a minimal system lifecycle audit and indexes newly covered ledgers', () => {
    expect(hardeningMigration).toContain('create table if not exists public.account_lifecycle_audit')
    expect(hardeningMigration).toContain('account_key_hash')
    expect(hardeningMigration).toContain('sync_account_lifecycle_audit')
    expect(hardeningMigration).toContain('github_webhook_deliveries_retention_idx')
    expect(hardeningMigration).toContain('github_connection_transactions_expiry_retention_idx')
    expect(hardeningMigration).toContain('account_step_up_confirmations_expiry_retention_idx')
    expect(hardeningMigration).toContain('extensions.digest')
    expect(hardeningMigration).not.toContain('encode(digest(')
  })

  it('only permits the scheduled endpoint with a server secret', () => {
    expect(cron).toContain('CRON_SECRET')
    expect(cron).toContain('timingSafeEqual')
    expect(cron).toContain('Bearer ')
    expect(vercel.crons).toContainEqual({ path: '/api/cron/retention', schedule: '17 3 * * *' })
  })
})
