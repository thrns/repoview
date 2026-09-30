import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260930190000_viewer_authorization_rpc.sql'), 'utf8')
const databaseTest = readFileSync(resolve(process.cwd(), 'supabase/tests/viewer_authorization_rpc.test.sql'), 'utf8')

describe('viewer authorization RPC migration', () => {
  it('defines narrowly scoped service-only SECURITY DEFINER functions with a fixed search path', () => {
    for (const [name, signature] of [
      ['resolve_share_capability', 'text'],
      ['authorize_viewer_session', 'text, uuid, text'],
    ]) {
      expect(migration).toMatch(new RegExp(`create or replace function public\\.${name}\\(`))
      expect(migration).toContain('security definer')
      expect(migration).toContain('set search_path = public')
      expect(migration).toContain(`revoke all on function public.${name}(${signature}) from PUBLIC`)
      expect(migration).toContain(`revoke all on function public.${name}(${signature}) from anon`)
      expect(migration).toContain(`revoke all on function public.${name}(${signature}) from authenticated`)
      expect(migration).toContain(`grant execute on function public.${name}(${signature}) to service_role`)
    }
    expect(migration).not.toMatch(/alter\s+table[^;]+disable\s+row\s+level\s+security/i)
  })

  it('uses hash inputs and separate UUID/share-code parameters without casting identifiers', () => {
    expect(migration).toContain('target_token_hash text')
    expect(migration).toContain('target_session_token_hash text')
    expect(migration).toContain('target_share_id uuid')
    expect(migration).toContain('target_share_code text')
    expect(migration).not.toMatch(/target_share_code\s*::\s*uuid/i)
    expect(migration).toContain("shares.token_hash = target_token_hash")
    expect(migration).toContain("viewer_sessions.session_token_hash = target_session_token_hash")
  })

  it('covers capability states, workspace boundaries, and execute privileges in pgTAP', () => {
    for (const phrase of [
      'valid capability is resolved',
      'revoked capability is denied',
      'expired capability is denied',
      'inactive workspace is denied',
      'disabled repository is denied',
      'inactive installation is denied',
      'session cannot cross shares',
      'session cannot cross workspaces',
      'anon cannot execute viewer authorization RPCs',
      'authenticated cannot execute viewer authorization RPCs',
      'service_role can execute viewer authorization RPCs',
    ]) {
      expect(databaseTest).toContain(phrase)
    }
  })
})
