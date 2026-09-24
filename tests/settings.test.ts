import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const page = readFileSync('app/(admin)/dashboard/settings/page.tsx', 'utf8')
const migration = readFileSync('supabase/migrations/20260924150000_settings_preferences.sql', 'utf8')

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
})
