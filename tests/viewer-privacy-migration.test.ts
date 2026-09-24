import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(new URL('../supabase/migrations/20260924180000_viewer_privacy_preferences.sql', import.meta.url), 'utf8')

describe('viewer privacy migration', () => {
  it('stores a separate privacy preference and defaults sessions to necessary-only', () => {
    expect(migration).toContain('create table if not exists public.viewer_privacy_preferences')
    expect(migration).toContain('preference_key_hash')
    expect(migration).toContain("analytics_mode in ('necessary', 'optional')")
    expect(migration).toContain("add column if not exists analytics_mode text not null default 'necessary'")
    expect(migration).toContain('add column if not exists gpc_applied boolean not null default false')
    expect(migration).toContain('viewers_workspace_token_hash_idx')
  })
})
