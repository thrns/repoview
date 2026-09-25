import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw Object.assign(new Error(`redirect:${path}`), { digest: 'NEXT_REDIRECT' })
  }),
}))
vi.mock('../lib/auth/workspace', () => ({
  ACTIVE_WORKSPACE_COOKIE: 'repoview-active-workspace',
  getUserWorkspaceMemberships: vi.fn(),
}))

import { cookies } from 'next/headers'
import { selectActiveWorkspace } from '../app/workspace/actions'
import { getUserWorkspaceMemberships } from '../lib/auth/workspace'

const getCookies = vi.mocked(cookies)
const getMemberships = vi.mocked(getUserWorkspaceMemberships)

const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }
const workspaceA = { id: '11111111-1111-4111-8111-111111111111', name: 'A' }
const workspaceB = { id: '22222222-2222-4222-8222-222222222222', name: 'B' }

beforeEach(() => {
  vi.clearAllMocks()
  getMemberships.mockResolvedValue({
    user,
    workspaces: [
      { workspace: workspaceA, membership: { role: 'owner' } },
      { workspace: workspaceB, membership: { role: 'member' } },
    ],
  } as never)
})

describe('active workspace selection', () => {
  it('sets a server-only active workspace cookie only for a current membership', async () => {
    const set = vi.fn()
    getCookies.mockResolvedValue({ set } as never)
    const input = new FormData()
    input.set('workspaceId', workspaceB.id)

    await expect(selectActiveWorkspace(input)).rejects.toThrow('redirect:/dashboard')
    expect(set).toHaveBeenCalledWith('repoview-active-workspace', workspaceB.id, expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }))
  })

  it('rejects a workspace ID outside the current membership set', async () => {
    const set = vi.fn()
    getCookies.mockResolvedValue({ set } as never)
    const input = new FormData()
    input.set('workspaceId', '33333333-3333-4333-8333-333333333333')

    await expect(selectActiveWorkspace(input)).rejects.toThrow('not available')
    expect(set).not.toHaveBeenCalled()
  })
})
