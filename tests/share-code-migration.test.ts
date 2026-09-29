import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260929090000_share_code_capability.sql'), 'utf8')

describe('share code migration', () => {
  it('allows new nine-character codes while preserving legacy eight-character codes', () => {
    expect(migration).toContain('alter column share_code type varchar(9)')
    expect(migration).toContain("share_code ~ '^[A-Za-z0-9]{9}$'")
    expect(migration).toContain("share_code ~ '^[A-Za-z0-9_-]{8}$'")
    expect(migration).toContain('create unique index if not exists shares_share_code_idx on public.shares(share_code)')
    expect(migration).toContain('generate_share_code')
  })
})
