import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260930191000_atomic_share_creation.sql'), 'utf8')
const databaseTest = readFileSync(resolve(process.cwd(), 'supabase/tests/atomic_share_creation.test.sql'), 'utf8')

describe('atomic share creation migration', () => {
  it('inserts share and optional recipient within one service-only function call', () => {
    expect(migration).toContain('create or replace function public.create_share_with_recipient(')
    expect(migration).toContain('security definer')
    expect(migration).toContain('set search_path = public')
    expect(migration).toContain('insert into public.shares')
    expect(migration).toContain('if target_create_recipient then')
    expect(migration).toContain('insert into public.share_recipients')
    expect(migration).toContain('return query select created_share_id, target_share_code')
    expect(migration).toContain('revoke all on function public.create_share_with_recipient')
    expect(migration).toContain('from PUBLIC')
    expect(migration).toContain('from anon')
    expect(migration).toContain('from authenticated')
    expect(migration).toContain('to service_role')
  })

  it('tests both optional-recipient paths and rollback after a recipient insert failure', () => {
    expect(databaseTest).toContain('share without a recipient is durable')
    expect(databaseTest).toContain('share with recipient is durable')
    expect(databaseTest).toContain('forced recipient failure leaves no share')
    expect(databaseTest).toContain('anon and authenticated cannot execute atomic share creation')
    expect(databaseTest).toContain('service_role can execute atomic share creation')
  })
})
