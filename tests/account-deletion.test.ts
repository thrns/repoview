import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { deleteAccountData, RECENT_AUTH_MAX_AGE_MS, isRecentlyAuthenticated } from '../lib/account/deletion'
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

  it('requires a recent authenticated sign-in', () => {
    const now = Date.parse('2026-09-24T12:00:00.000Z')
    expect(isRecentlyAuthenticated({ last_sign_in_at: new Date(now - RECENT_AUTH_MAX_AGE_MS).toISOString() }, now)).toBe(true)
    expect(isRecentlyAuthenticated({ last_sign_in_at: new Date(now - RECENT_AUTH_MAX_AGE_MS - 1).toISOString() }, now)).toBe(false)
    expect(isRecentlyAuthenticated({ last_sign_in_at: null }, now)).toBe(false)
  })

  it('disables the workspace before revoking and deleting tenant data', async () => {
    const operations: string[] = []
    const admin = createAdminMock(operations)
    getAdmin.mockReturnValue(admin as never)

    await expect(deleteAccountData({
      user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: new Date().toISOString() } as never,
      confirmation: 'DELETE owner@example.com',
    })).resolves.toEqual({ deleted: true })

    expect(operations.slice(0, 9)).toEqual([
      'workspaces:select',
      'workspaces:eq',
      'workspace_members:select',
      'workspace_members:in',
      'workspace_members:neq',
      'workspaces:update',
      'workspaces:in',
      'shares:update',
      'shares:in',
    ])
    expect(operations).toContain('workspaces:delete')
    expect(operations.indexOf('workspace_members:delete')).toBeLessThan(operations.indexOf('workspaces:delete'))
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('does not start cleanup without the exact confirmation', async () => {
    getAdmin.mockReturnValue(createAdminMock([]) as never)

    await expect(deleteAccountData({
      user: { id: 'user-1', email: 'owner@example.com', last_sign_in_at: new Date().toISOString() } as never,
      confirmation: 'DELETE someone-else@example.com',
    })).rejects.toMatchObject({ code: 'confirmation_required' })
    expect(getAdmin).not.toHaveBeenCalled()
  })
})

function createAdminMock(operations: string[], shareUpdateError: { message: string } | null = null) {
  function chain(table: string, result: { data?: unknown; error: { message?: string } | null }) {
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'in', 'neq', 'is', 'update', 'delete']) {
      query[method] = vi.fn(() => {
        operations.push(`${table}:${method}`)
        return query
      })
    }
    query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject)
    return query
  }

  return {
    from(table: string) {
      if (table === 'workspaces') return chain(table, { data: [{ id: 'workspace-1' }], error: null })
      if (table === 'workspace_members') return chain(table, { data: [], error: null })
      if (table === 'shares' && operations.includes('workspaces:update')) return chain(table, { data: null, error: shareUpdateError })
      return chain(table, { data: null, error: null })
    },
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
  }
}
