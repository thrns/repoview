import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924250000_system_admins.sql', 'utf8')
const guard = readFileSync('lib/auth/system-admin.ts', 'utf8')
const overview = readFileSync('lib/system-admin/overview.ts', 'utf8')

describe('system administration boundary', () => {
  it('creates explicit operator grants separate from workspace membership', () => {
    expect(migration).toContain('create table if not exists public.system_admins')
    expect(migration).toContain("role text not null default 'operator'")
    expect(migration).toContain("status in ('active', 'suspended', 'revoked')")
    expect(migration).toContain('separate from workspace_members')
    expect(guard).toContain("from('system_admins')")
    expect(guard).not.toContain('workspace_members')
  })

  it('keeps operator audit rows server-only and metadata-only', () => {
    expect(migration).toContain('create table if not exists public.system_admin_audit_logs')
    expect(migration).toContain('revoke all on table public.system_admin_audit_logs from anon, authenticated')
    expect(readFileSync('lib/system-admin/audit.ts', 'utf8')).toContain('sanitizeMetadataWithSchema')
    expect(overview).not.toContain('github_owner')
    expect(overview).not.toContain('github_repo')
    expect(overview).not.toContain("select('github_owner")
    expect(overview).not.toContain("select('github_repo")
    expect(overview).not.toContain("select('recipient")
  })

  it('keeps the legacy email equality role out of runtime configuration', () => {
    expect(readFileSync('lib/env/schema.ts', 'utf8')).not.toContain('ADMIN_EMAIL')
    expect(readFileSync('lib/env/server.ts', 'utf8')).not.toContain('ADMIN_EMAIL')
  })
})
