import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({
  ViewerAuthorizationError: class ViewerAuthorizationError extends Error {},
  requireViewerSession: vi.fn(),
}))
vi.mock('../lib/repositories/synchronize', () => ({
  RepositorySynchronizationError: class RepositorySynchronizationError extends Error {
    code = 'unavailable'
  },
  synchronizeRepositoryForGitHub: vi.fn(),
}))

import { requireViewerRepositoryAccess, ViewerRepositoryAccessError } from '../lib/auth/viewer-access'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { synchronizeRepositoryForGitHub } from '../lib/repositories/synchronize'

const requireSession = vi.mocked(requireViewerSession)
const synchronizeRepository = vi.mocked(synchronizeRepositoryForGitHub)

const viewer = {
  repository: {
    id: 'repository-1',
    workspace_id: 'workspace-1',
    github_installation_id: 'installation-record-1',
    github_repository_id: 42,
    github_owner: 'renamed-owner',
    github_repo: 'renamed-repository',
    enabled: true,
  },
  share: { id: 'share-1', repository_id: 'repository-1', workspace_id: 'workspace-1' },
  session: { id: 'session-1' },
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue(viewer as never)
})

describe('viewer repository authorization', () => {
  it('uses persisted repository metadata after session authorization without synchronizing GitHub', async () => {
    await expect(requireViewerRepositoryAccess('share-1')).resolves.toMatchObject({
      installationRecordId: 'installation-record-1',
      accessibleRepository: {
        githubRepositoryId: 42,
        owner: 'renamed-owner',
        name: 'renamed-repository',
      },
    })
    expect(synchronizeRepository).not.toHaveBeenCalled()
  })

  it('denies a repository whose persisted enabled state is false', async () => {
    requireSession.mockResolvedValue({
      ...viewer,
      repository: { ...viewer.repository, enabled: false },
    } as never)

    await expect(requireViewerRepositoryAccess('share-1')).rejects.toBeInstanceOf(ViewerRepositoryAccessError)
    expect(synchronizeRepository).not.toHaveBeenCalled()
  })

  it('reports a missing stable repository identity as repository unavailable', async () => {
    requireSession.mockResolvedValue({
      ...viewer,
      repository: { ...viewer.repository, github_repository_id: null },
    } as never)

    await expect(requireViewerRepositoryAccess('share-1')).rejects.toMatchObject({
      name: 'ViewerRepositoryAccessError',
      reason: 'repository_unavailable',
    })
  })
})
