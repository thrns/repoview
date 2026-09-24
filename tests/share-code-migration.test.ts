import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260922120000_add_share_code.sql'), 'utf8')

describe('share code migration', () => {
  it('adds a unique public code with an eight-character format', () => {
    expect(migration).toContain('add column if not exists share_code varchar(8)')
    expect(migration).toContain("share_code ~ '^[A-Za-z0-9_-]{8}$'")
    expect(migration).toContain('create unique index shares_share_code_idx on public.shares(share_code)')
  })
})
