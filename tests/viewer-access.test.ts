import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/viewer-session', () => ({
  ViewerAuthorizationError: class ViewerAuthorizationError extends Error {},
  requireViewerSession: vi.fn(),
}))
vi.mock('../lib/github/client', () => ({ getGitHubInstallationIdForRepository: vi.fn() }))
vi.mock('../lib/github/repositories', () => ({ listInstallationRepositories: vi.fn() }))

import { requireViewerRepositoryAccess } from '../lib/auth/viewer-access'
import { requireViewerSession } from '../lib/auth/viewer-session'
import { getGitHubInstallationIdForRepository } from '../lib/github/client'
import { listInstallationRepositories } from '../lib/github/repositories'

const requireSession = vi.mocked(requireViewerSession)
const getInstallationId = vi.mocked(getGitHubInstallationIdForRepository)
const listRepositories = vi.mocked(listInstallationRepositories)

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
  getInstallationId.mockResolvedValue(5678)
  listRepositories.mockResolvedValue([accessibleRepository])
})

describe('viewer repository authorization', () => {
  it('checks current installation access by stable repository id before returning mutable location metadata', async () => {
    await expect(requireViewerRepositoryAccess('share-1')).resolves.toMatchObject({
      installationId: 5678,
      accessibleRepository: {
        githubRepositoryId: 42,
        owner: 'renamed-owner',
        name: 'renamed-repository',
      },
    })
    expect(getInstallationId).toHaveBeenCalledWith('repository-1', 'workspace-1')
    expect(listRepositories).toHaveBeenCalledWith(5678, 'installation-record-1')
    expect(requireSession.mock.invocationCallOrder[0]).toBeLessThan(getInstallationId.mock.invocationCallOrder[0] ?? Infinity)
    expect(getInstallationId.mock.invocationCallOrder[0]).toBeLessThan(listRepositories.mock.invocationCallOrder[0] ?? Infinity)
  })

  it.each([
    ['suspended installation', () => getInstallationId.mockRejectedValue(new Error('inactive'))],
    ['repository removed from installation', () => listRepositories.mockResolvedValue([])],
    ['repository disabled by GitHub', () => listRepositories.mockResolvedValue([{ ...accessibleRepository, disabled: true }])],
  ])('denies access when %s', async (_label, configure) => {
    configure()
    await expect(requireViewerRepositoryAccess('share-1')).rejects.toThrow()
  })
})
