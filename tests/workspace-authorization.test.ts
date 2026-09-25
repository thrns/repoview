import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('../lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }))

import {
  requireRepositoryAccess,
  requireShareAccess,
  requireUser,
  requireWorkspace,
  requireWorkspaceMember,
  requireWorkspaceRole,
  resolveActiveWorkspaceId,
} from '../lib/auth/workspace'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '../lib/supabase/server'

const getServer = vi.mocked(createSupabaseServerClient)
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@example.com' }
const workspaceA = '11111111-1111-4111-8111-111111111111'
const workspaceB = '22222222-2222-4222-8222-222222222222'
const repositoryA = '33333333-3333-4333-8333-333333333333'
const repositoryB = '44444444-4444-4444-8444-444444444444'
const shareA = '55555555-5555-4555-8555-555555555555'
const shareB = '66666666-6666-4666-8666-666666666666'

const workspaceRowA = { id: workspaceA, name: 'A', slug: 'a', owner_id: user.id, is_personal: true, status: 'active' as const, deletion_started_at: null, deletion_completed_at: null, created_at: '2026-09-24T00:00:00.000Z', updated_at: '2026-09-24T00:00:00.000Z' }
const workspaceRowB = { id: workspaceB, name: 'B', slug: 'b', owner_id: user.id, is_personal: false, status: 'active' as const, deletion_started_at: null, deletion_completed_at: null, created_at: '2026-09-24T00:00:01.000Z', updated_at: '2026-09-24T00:00:01.000Z' }

function createRlsClient({ includeWorkspaceB = false } = {}) {
  const memberships = [
    { workspace_id: workspaceA, user_id: user.id, role: 'owner' as const, created_at: '2026-09-24T00:00:00.000Z', updated_at: '2026-09-24T00:00:00.000Z' },
    ...(includeWorkspaceB ? [{ workspace_id: workspaceB, user_id: user.id, role: 'member' as const, created_at: '2026-09-24T00:00:01.000Z', updated_at: '2026-09-24T00:00:01.000Z' }] : []),
  ]
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
        in: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => unknown) => {
          if (table === 'workspace_members') return Promise.resolve(resolve({ data: memberships, error: null }))
          if (table === 'workspaces') return Promise.resolve(resolve({ data: includeWorkspaceB ? [workspaceRowA, workspaceRowB] : [workspaceRowA], error: null }))
          return Promise.resolve(resolve({ data: [], error: null }))
        },
        maybeSingle: vi.fn(async () => {
          if (table === 'workspace_members') {
            return filters.workspace_id === workspaceA || (filters.workspace_id === workspaceB && includeWorkspaceB)
              ? { data: memberships.find((membership) => membership.workspace_id === filters.workspace_id), error: null }
              : { data: null, error: null }
          }
          if (table === 'workspaces') {
            return filters.id === workspaceA || (filters.id === workspaceB && includeWorkspaceB)
              ? { data: filters.id === workspaceA ? workspaceRowA : workspaceRowB, error: null }
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
  vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) } as never)
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

  it('uses the verified active workspace instead of the first membership', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: workspaceB }) } as never)
    getServer.mockResolvedValue(createRlsClient({ includeWorkspaceB: true }) as never)

    await expect(requireWorkspace()).resolves.toMatchObject({ workspace: { id: workspaceB }, membership: { role: 'member' } })
    await expect(requireRepositoryAccess(repositoryB)).resolves.toMatchObject({ workspace: { id: workspaceB }, repository: { id: repositoryB } })
    await expect(requireRepositoryAccess(repositoryA)).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('does not accept an unverified workspace cookie', () => {
    const selections = [
      { workspace: workspaceRowA, membership: membershipsFor(workspaceA, 'owner') },
      { workspace: workspaceRowB, membership: membershipsFor(workspaceB, 'member') },
    ]
    expect(resolveActiveWorkspaceId(selections, 'not-a-member')).toBeNull()
    expect(resolveActiveWorkspaceId(selections, workspaceB)).toBe(workspaceB)
    expect(resolveActiveWorkspaceId([selections[0]], 'not-a-member')).toBe(workspaceA)
  })
})

function membershipsFor(workspaceId: string, role: 'owner' | 'member') {
  return { workspace_id: workspaceId, user_id: user.id, role, created_at: '2026-09-24T00:00:00.000Z', updated_at: '2026-09-24T00:00:00.000Z' }
}
