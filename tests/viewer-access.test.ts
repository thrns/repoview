import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({
  ViewerAuthorizationError: class ViewerAuthorizationError extends Error {},
  requireViewerSession: vi.fn(),
}))
vi.mock('../lib/repositories/synchronize', () => ({ synchronizeRepositoryForGitHub: vi.fn() }))

import { requireViewerRepositoryAccess } from '../lib/auth/viewer-access'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { synchronizeRepositoryForGitHub } from '../lib/repositories/synchronize'

const requireSession = vi.mocked(requireViewerSession)
const synchronizeRepository = vi.mocked(synchronizeRepositoryForGitHub)

const accessibleRepository = {
  githubRepositoryId: 42,
  githubNodeId: 'node-42',
  installationRecordId: 'installation-record-1',
  owner: 'renamed-owner',
  name: 'renamed-repository',
  fullName: 'renamed-owner/renamed-repository',
  private: true,
  defaultBranch: 'main',
  description: null,
  htmlUrl: 'https://github.com/renamed-owner/renamed-repository',
  archived: false,
  disabled: false,
}

const viewer = {
  repository: {
    id: 'repository-1',
    workspace_id: 'workspace-1',
    github_installation_id: 'installation-record-1',
    github_repository_id: 42,
  },
  share: { id: 'share-1', workspace_id: 'workspace-1' },
  session: { id: 'session-1' },
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue(viewer as never)
  synchronizeRepository.mockResolvedValue({
    repository: { ...viewer.repository, enabled: true },
    githubRepository: accessibleRepository,
  } as never)
})

describe('viewer repository authorization', () => {
  it('checks current installation access by stable repository id before returning mutable location metadata', async () => {
    await expect(requireViewerRepositoryAccess('share-1')).resolves.toMatchObject({
      installationRecordId: 'installation-record-1',
      accessibleRepository: {
        githubRepositoryId: 42,
        owner: 'renamed-owner',
        name: 'renamed-repository',
      },
    })
    expect(synchronizeRepository).toHaveBeenCalledWith('repository-1', 'workspace-1', 'system')
    expect(requireSession.mock.invocationCallOrder[0]).toBeLessThan(synchronizeRepository.mock.invocationCallOrder[0] ?? Infinity)
  })

  it.each([
    ['suspended installation', () => synchronizeRepository.mockRejectedValue(new Error('inactive'))],
    ['repository removed from installation', () => synchronizeRepository.mockRejectedValue(new Error('removed'))],
    ['repository disabled by GitHub', () => synchronizeRepository.mockResolvedValue({
      repository: { ...viewer.repository, enabled: true },
      githubRepository: { ...accessibleRepository, disabled: true },
    } as never)],
  ])('denies access when %s', async (_label, configure) => {
    configure()
    await expect(requireViewerRepositoryAccess('share-1')).rejects.toThrow()
  })
})
