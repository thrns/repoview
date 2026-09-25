import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { deleteAccountData } from '../lib/account/deletion'
import { getAccountDeletionConfirmation } from '../lib/account/deletion-shared'

const getAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('account deletion safeguards', () => {
  it('uses an account-specific confirmation phrase', () => {
    expect(getAccountDeletionConfirmation('owner@example.com')).toBe('DELETE owner@example.com')
    expect(getAccountDeletionConfirmation(null)).toBe('DELETE MY ACCOUNT')
  })

  it('does not treat last_sign_in_at as a deletion confirmation', async () => {
    getAdmin.mockReturnValue(createAdminMock() as never)

    await expect(deleteAccountData({
      user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: new Date().toISOString() } as never,
      confirmation: 'DELETE owner@example.com',
      stepUpConfirmed: false,
    })).rejects.toMatchObject({ code: 'recent_auth_required' })
    expect(getAdmin).not.toHaveBeenCalled()
  })

  it('disables the workspace before revoking and deleting tenant data', async () => {
    const admin = createAdminMock()
    getAdmin.mockReturnValue(admin as never)

    await expect(deleteAccountData({
      user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: new Date().toISOString() } as never,
      confirmation: 'DELETE owner@example.com',
      stepUpConfirmed: true,
    })).resolves.toMatchObject({ queued: true, jobId: 'job-1' })
    expect(admin.rpc).toHaveBeenCalledWith('request_account_deletion', { target_user_id: 'user-1' })
  })

  it('does not start cleanup without the exact confirmation', async () => {
    getAdmin.mockReturnValue(createAdminMock() as never)

    await expect(deleteAccountData({
      user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: new Date().toISOString() } as never,
      confirmation: 'DELETE someone-else@example.com',
      stepUpConfirmed: true,
    })).rejects.toMatchObject({ code: 'confirmation_required' })
    expect(getAdmin).not.toHaveBeenCalled()
  })
})

function createAdminMock(rpcError: { message: string } | null = null) {
  function chain(result: { data?: unknown; error: { message?: string } | null }) {
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'neq', 'is', 'update', 'delete']) query[method] = vi.fn(() => query)
    query.rpc = vi.fn()
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
    return query
  }

  return {
    rpc: vi.fn().mockResolvedValue({ data: { id: 'job-1', status: 'queued' }, error: rpcError }),
    from() {
      return chain({ data: null, error: null })
    },
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
  }
}
