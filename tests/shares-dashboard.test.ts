import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { getShareStatus } from '../lib/shares/dashboard'

const now = new Date('2026-09-21T12:00:00.000Z')
const share = {
  revoked_at: null,
  expires_at: null,
}
const repository = { enabled: true } as never

describe('share dashboard status', () => {
  it('derives active, expiring, expired, revoked, and disabled states', () => {
    expect(getShareStatus(share as never, repository, now)).toBe('active')
    expect(getShareStatus({ ...share, expires_at: '2026-09-25T12:00:00.000Z' } as never, repository, now)).toBe('expiring-soon')
    expect(getShareStatus({ ...share, expires_at: '2026-09-20T12:00:00.000Z' } as never, repository, now)).toBe('expired')
    expect(getShareStatus({ ...share, revoked_at: '2026-09-20T12:00:00.000Z' } as never, repository, now)).toBe('revoked')
    expect(getShareStatus(share as never, { enabled: false } as never, now)).toBe('repository-disabled')
  })
})
