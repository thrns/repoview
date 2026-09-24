import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924140000_saas_onboarding.sql', 'utf8')
const correctionMigration = readFileSync('supabase/migrations/20260924260000_onboarding_correction.sql', 'utf8')

describe('SaaS onboarding migration', () => {
  it('records onboarding and current legal-version checkpoints on profiles', () => {
    for (const column of ['profile_completed_at', 'terms_version_accepted', 'terms_accepted_at', 'privacy_version_acknowledged', 'privacy_acknowledged_at', 'onboarding_completed_at']) {
      expect(migration).toContain(column)
    }
    expect(migration).toContain('create or replace function public.complete_profile')
  })

  it('uses one current legal-version source for runtime and profile completion', () => {
    expect(correctionMigration).toContain('create or replace function public.current_legal_versions()')
    expect(correctionMigration).toContain("'2026-09-23'::text as terms_version")
    expect(correctionMigration).toContain("'2026-09-24'::text as privacy_version")
    expect(correctionMigration).toContain('from public.current_legal_versions() as versions')
  })

  it('makes personal workspace provisioning idempotent and owner-scoped', () => {
    expect(correctionMigration).toContain('create unique index if not exists workspaces_personal_owner_id_key')
    expect(correctionMigration).toContain('where is_personal')
    expect(correctionMigration).toContain('on conflict (owner_id) where is_personal do nothing')
    expect(correctionMigration).toContain('on conflict (workspace_id, user_id) do update')
    expect(correctionMigration).toContain('on conflict (workspace_id) do nothing')
    expect(correctionMigration).toContain('insert into public.workspaces (name, slug, owner_id, is_personal)')
    expect(correctionMigration).toContain('workspace_members_one_owner_per_workspace_key')
  })

  it('does not expose compliance writes to the browser role', () => {
    expect(migration).toContain('revoke update on public.profiles from authenticated')
    expect(migration).toContain('grant update (full_name, avatar_url) on public.profiles to authenticated')
    expect(migration).toContain('grant execute on function public.complete_profile(text) to authenticated')
    expect(correctionMigration).toContain('grant execute on function public.complete_profile(text) to authenticated')
  })
})
