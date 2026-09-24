import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

import {
  requireRepositoryAccess,
  requireShareAccess,
  requireUser,
  requireWorkspaceMember,
  requireWorkspaceRole,
} from '../lib/auth/workspace'
import { createSupabaseServerClient } from '../lib/supabase/server'

const getServer = vi.mocked(createSupabaseServerClient)
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@example.com' }
const workspaceA = '11111111-1111-4111-8111-111111111111'
const workspaceB = '22222222-2222-4222-8222-222222222222'
const repositoryA = '33333333-3333-4333-8333-333333333333'
const repositoryB = '44444444-4444-4444-8444-444444444444'
const shareA = '55555555-5555-4555-8555-555555555555'
const shareB = '66666666-6666-4666-8666-666666666666'

function createRlsClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((field: string, value: unknown) => {
          filters[field] = value
          return query
        }),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => {
          if (table === 'workspace_members') {
            return filters.workspace_id === workspaceA
              ? { data: { workspace_id: workspaceA, user_id: user.id, role: 'owner' }, error: null }
              : { data: null, error: null }
          }
          if (table === 'workspaces') {
            return filters.id === workspaceA
              ? { data: { id: workspaceA, name: 'A', slug: 'a', owner_id: user.id }, error: null }
              : { data: null, error: null }
          }
          if (table === 'repositories') {
            return filters.id === repositoryA
              ? { data: { id: repositoryA, workspace_id: workspaceA, github_owner: 'a', github_repo: 'repo' }, error: null }
              : filters.id === repositoryB
                ? { data: { id: repositoryB, workspace_id: workspaceB, github_owner: 'b', github_repo: 'private' }, error: null }
              : { data: null, error: null }
          }
          if (table === 'shares') {
            return filters.id === shareA
              ? { data: { id: shareA, workspace_id: workspaceA, repository_id: repositoryA }, error: null }
              : filters.id === shareB
                ? { data: { id: shareB, workspace_id: workspaceB, repository_id: repositoryB }, error: null }
              : { data: null, error: null }
          }
          return { data: null, error: null }
        }),
      }
      return query
    },
  }
}

beforeEach(() => {
  getServer.mockResolvedValue(createRlsClient() as never)
})

describe('workspace authorization helpers', () => {
  it('keeps authentication separate from workspace authorization', async () => {
    await expect(requireUser()).resolves.toMatchObject({ id: user.id })
    await expect(requireWorkspaceMember(workspaceA)).resolves.toMatchObject({ workspace: { id: workspaceA }, membership: { role: 'owner' } })
    await expect(requireWorkspaceMember(workspaceB)).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('enforces role checks independently of authentication', async () => {
    await expect(requireWorkspaceRole(workspaceA, ['owner', 'admin'])).resolves.toMatchObject({ workspace: { id: workspaceA } })
    await expect(requireWorkspaceRole(workspaceA, ['member'])).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('fails closed when a resource belongs to another workspace', async () => {
    await expect(requireRepositoryAccess(repositoryB)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(requireShareAccess(shareB)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(requireRepositoryAccess(repositoryA)).resolves.toMatchObject({ workspace: { id: workspaceA }, repository: { id: repositoryA } })
    await expect(requireShareAccess(shareA)).resolves.toMatchObject({ workspace: { id: workspaceA }, share: { id: shareA } })
  })
})
