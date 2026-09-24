import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))
vi.mock('../lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { getSystemAdminContext } from '../lib/auth/system-admin'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { createSupabaseServerClient } from '../lib/supabase/server'

const getServer = vi.mocked(createSupabaseServerClient)
const getAdmin = vi.mocked(createSupabaseAdminClient)

function queryResult(data: unknown, error: unknown = null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  return query
}

describe('system admin authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('authorizes only an active explicit system_admin grant', async () => {
    const server = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'operator-1', email: 'operator@example.com' } }, error: null }) } }
    const adminQuery = queryResult({ user_id: 'operator-1', role: 'operator', status: 'active' })
    getServer.mockResolvedValue(server as never)
    getAdmin.mockReturnValue({ from: vi.fn().mockReturnValue(adminQuery) } as never)

    await expect(getSystemAdminContext()).resolves.toMatchObject({ systemAdmin: { user_id: 'operator-1', status: 'active' } })
    expect(adminQuery.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('does not authorize a revoked grant and never falls back to workspace membership', async () => {
    const server = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'customer-1' } }, error: null }) } }
    const adminQuery = queryResult(null)
    const from = vi.fn().mockReturnValue(adminQuery)
    getServer.mockResolvedValue(server as never)
    getAdmin.mockReturnValue({ from } as never)

    await expect(getSystemAdminContext()).resolves.toBeNull()
    expect(from).toHaveBeenCalledWith('system_admins')
    expect(from).not.toHaveBeenCalledWith('workspace_members')
  })

  it('fails closed when the authenticated user is missing', async () => {
    getServer.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } } as never)
    await expect(getSystemAdminContext()).resolves.toBeNull()
    expect(getAdmin).not.toHaveBeenCalled()
  })
})
