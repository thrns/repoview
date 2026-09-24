import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260924110000_repository_identity.sql'), 'utf8')

describe('repository identity migration', () => {
  it('bridges deployments that applied the earlier tenancy migration shape', () => {
    expect(migration).toContain('add column if not exists github_installation_id uuid')
    expect(migration).toContain("column_name = 'installation_id'")
    expect(migration).toContain('github_installations_workspace_id_id_key')
    expect(migration).toContain('repositories_workspace_github_installation_fk')
    expect(migration).toContain('Every repository must belong to a workspace GitHub installation')
  })

  it('adds stable GitHub identity fields and workspace-scoped uniqueness', () => {
    expect(migration).toContain('add column github_repository_id bigint')
    expect(migration).toContain('add column github_node_id text')
    expect(migration).toContain('repositories_workspace_repository_id_key')
    expect(migration).toContain('unique (workspace_id, github_repository_id)')
    expect(migration).toContain('drop constraint if exists repositories_workspace_name_key')
  })

  it('does not recreate repository rows or touch share references during backfill', () => {
    expect(migration).not.toContain('drop table public.repositories')
    expect(migration).not.toContain('delete from public.repositories')
    expect(migration).not.toContain('alter table public.shares')
    expect(migration).toContain('nullable only while the one-time legacy sync is pending')
  })
})
