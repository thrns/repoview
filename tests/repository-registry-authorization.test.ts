import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireRepositoryAccess: vi.fn(),
  requireWorkspace: vi.fn(),
  requireWorkspaceAdmin: vi.fn(),
  requireWorkspaceRole: vi.fn(),
}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

import { requireRepositoryAccess, requireWorkspaceRole } from '../lib/auth/workspace'
import { setRepositoryEnabled, updateRepositoryVisibilityRules } from '../lib/repositories/registry'
import { createSupabaseServerClient } from '../lib/supabase/server'

const requireRepository = vi.mocked(requireRepositoryAccess)
const getServer = vi.mocked(createSupabaseServerClient)
const roleCheck = vi.mocked(requireWorkspaceRole)
const repositoryId = '77777777-7777-4777-8777-777777777777'

beforeEach(() => {
  vi.clearAllMocks()
  requireRepository.mockRejectedValue(new Error('forbidden'))
})

describe('repository registry authorization', () => {
  it('rejects cross-workspace repository mutations before opening a write client', async () => {
    await expect(setRepositoryEnabled(repositoryId, false)).rejects.toThrow('forbidden')
    await expect(updateRepositoryVisibilityRules(repositoryId, { hidden: [], allowOnly: [] })).rejects.toThrow('forbidden')
    expect(getServer).not.toHaveBeenCalled()
    expect(roleCheck).not.toHaveBeenCalled()
  })
})
