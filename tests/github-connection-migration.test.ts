import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260924120000_github_connection_flow.sql', 'utf8')

describe('GitHub connection migration', () => {
  it('keeps connection state server-only and one-time', () => {
    expect(migration).toContain('create table public.github_connection_transactions')
    expect(migration).toContain('state_hash text not null unique')
    expect(migration).toContain('code_verifier text not null')
    expect(migration).toContain('alter table public.github_connection_transactions enable row level security')
    expect(migration).toContain("status = 'awaiting_authorization'")
    expect(migration).toContain("status = 'consumed'")
    expect(migration).toContain('grant execute on function public.consume_github_connection_transaction')
  })
})
