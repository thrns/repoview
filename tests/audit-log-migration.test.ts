import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924240000_audit_actor_identity.sql', 'utf8')
const types = readFileSync('lib/supabase/database.types.ts', 'utf8')

describe('audit log identity migration', () => {
  it('adds an explicit actor_user_id without breaking legacy actor_id records', () => {
    expect(migration).toContain('add column if not exists actor_user_id uuid')
    expect(migration).toContain('set actor_user_id = actor_id')
    expect(migration).toContain('sync_audit_actor_identity')
    expect(migration).toContain('audit_logs_workspace_actor_created_idx')
    expect(types).toContain('actor_user_id: string | null')
  })
})
