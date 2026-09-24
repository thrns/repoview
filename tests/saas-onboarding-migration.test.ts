import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924140000_saas_onboarding.sql', 'utf8')

describe('SaaS onboarding migration', () => {
  it('records onboarding and current legal-version checkpoints on profiles', () => {
    for (const column of ['profile_completed_at', 'terms_version_accepted', 'terms_accepted_at', 'privacy_version_acknowledged', 'privacy_acknowledged_at', 'onboarding_completed_at']) {
      expect(migration).toContain(column)
    }
    expect(migration).toContain("terms_version_accepted = '2026-09-23'")
    expect(migration).toContain("privacy_version_acknowledged = '2026-09-23'")
    expect(migration).toContain('create or replace function public.complete_profile')
  })

  it('makes personal workspace provisioning idempotent and owner-scoped', () => {
    expect(migration).toContain('create unique index if not exists workspaces_personal_owner_id_key')
    expect(migration).toContain('where is_personal')
    expect(migration).toContain('on conflict (owner_id) where is_personal do nothing')
    expect(migration).toContain('on conflict (workspace_id, user_id) do nothing')
    expect(migration).toContain('on conflict (workspace_id) do nothing')
  })

  it('does not expose compliance writes to the browser role', () => {
    expect(migration).toContain('revoke update on public.profiles from authenticated')
    expect(migration).toContain('grant update (full_name, avatar_url) on public.profiles to authenticated')
    expect(migration).toContain('grant execute on function public.complete_profile(text) to authenticated')
  })
})
