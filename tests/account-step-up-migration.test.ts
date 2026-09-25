import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260924280000_account_step_up_confirmations.sql', 'utf8')

describe('account step-up confirmation migration', () => {
  it('stores only hashed, short-lived, operation-bound confirmations', () => {
    expect(migration).toContain('token_hash text not null unique')
    expect(migration).toContain("operation text not null check (operation in ('account-delete', 'account-export'))")
    expect(migration).toContain('expires_at timestamptz not null')
    expect(migration).toContain('consumed_at timestamptz')
    expect(migration).toContain('references auth.users(id) on delete cascade')
  })

  it('keeps confirmations service-role-only under RLS', () => {
    expect(migration).toContain('enable row level security')
    expect(migration).toContain('revoke all on table public.account_step_up_confirmations from anon, authenticated')
    expect(migration).toContain('grant all on table public.account_step_up_confirmations to service_role')
  })
})
