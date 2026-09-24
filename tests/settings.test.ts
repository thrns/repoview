import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync('app/(admin)/dashboard/settings/page.tsx', 'utf8')
const migration = readFileSync('supabase/migrations/20260924150000_settings_preferences.sql', 'utf8')
const destinationMigration = readFileSync('supabase/migrations/20260924160000_workspace_notification_destinations.sql', 'utf8')
const envSchema = readFileSync('lib/env/schema.ts', 'utf8')
const deletionMigration = readFileSync('supabase/migrations/20260924200000_account_lifecycle.sql', 'utf8')
const deletionRoute = readFileSync('app/api/account/delete/route.ts', 'utf8')
const accountSettings = readFileSync('components/admin/settings-account.tsx', 'utf8')
const deletionConfirmation = readFileSync('lib/account/deletion-shared.ts', 'utf8')

describe('public settings surface', () => {
  it('keeps settings focused on account, access, notifications, and privacy', () => {
    for (const section of ['Account', 'Security', 'GitHub', 'Notifications', 'Privacy & Data']) {
      expect(page).toContain(`title="${section}"`)
    }
    expect(page).not.toContain('SendTestEmailForm')
    expect(page).not.toContain('SMTP')
  })

  it('stores notification and privacy preferences per workspace', () => {
    for (const column of ['notify_on_returning_view', 'notify_on_download', 'notify_on_session_summary', 'notify_on_security_alert', 'digest_frequency', 'analytics_enabled', 'analytics_retention_days']) {
      expect(migration).toContain(column)
    }
    expect(migration).toContain('notification_settings_digest_frequency_check')
    expect(migration).toContain('notification_settings_analytics_retention_days_check')
  })

  it('migrates customer destinations into verified workspace settings', () => {
    for (const column of ['destination_email', 'email_verified', 'view_opened', 'returning_view', 'download', 'session_summary', 'security_alerts']) {
      expect(destinationMigration).toContain(column)
    }
    expect(destinationMigration).toContain('users.email_confirmed_at is not null')
    expect(envSchema).not.toContain('NOTIFICATION_TO_EMAIL')
  })

  it('exposes account export and a destructive confirmation flow instead of a mailto request', () => {
    expect(accountSettings).toContain('/api/account/delete')
    expect(accountSettings).toContain('Permanently delete')
    expect(deletionConfirmation).toContain('DELETE')
    expect(accountSettings).not.toContain('mailto:')
    expect(deletionRoute).toContain('deleteAccountData')
  })

  it('adds a fail-closed workspace lifecycle for account cleanup', () => {
    expect(deletionMigration).toContain("status in ('active', 'deleting', 'deleted')")
    expect(deletionMigration).toContain('deletion_started_at')
    expect(deletionMigration).toContain("status in ('deleting', 'deleted')")
  })
})
