import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/auth/workspace', () => ({
  requireWorkspaceMember: vi.fn(async () => undefined),
}))
vi.mock('../lib/github/client', () => ({
  listWorkspaceGitHubInstallations: vi.fn(),
}))
vi.mock('../lib/github/repositories', () => ({
  getRepositoryMetadataById: vi.fn(),
}))
vi.mock('../lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))
vi.mock('../lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { listWorkspaceGitHubInstallations } from '../lib/github/client'
import { getRepositoryMetadataById } from '../lib/github/repositories'
import { GitHubRepositoryError } from '../lib/github/types'
import { createSupabaseAdminClient } from '../lib/supabase/admin'
import { createSupabaseServerClient } from '../lib/supabase/server'
import {
  RepositorySynchronizationError,
  synchronizeRepositoryForGitHub,
} from '../lib/repositories/synchronize'

const listInstallations = vi.mocked(listWorkspaceGitHubInstallations)
const getMetadata = vi.mocked(getRepositoryMetadataById)
const getAdmin = vi.mocked(createSupabaseAdminClient)
const getServer = vi.mocked(createSupabaseServerClient)

const repository = {
  id: 'repository-1',
  workspace_id: 'workspace-1',
  github_installation_id: 'installation-old',
  github_repository_id: 42 as number | null,
  github_node_id: 'old-node',
  github_owner: 'old-owner',
  github_repo: 'old-name',
  default_branch: 'main',
  enabled: true,
}

const installationOld = { id: 'installation-old', workspace_id: 'workspace-1', github_installation_id: 1001, status: 'active' }
const installationNew = { id: 'installation-new', workspace_id: 'workspace-1', github_installation_id: 1002, status: 'active' }

function githubRepository(overrides: Record<string, unknown> = {}) {
  return {
    githubRepositoryId: 42,
    githubNodeId: 'new-node',
    installationRecordId: 'installation-new',
    owner: 'new-owner',
    name: 'renamed-repository',
    fullName: 'new-owner/renamed-repository',
    private: true,
    defaultBranch: 'trunk',
    description: null,
    htmlUrl: 'https://github.com/new-owner/renamed-repository',
    archived: false,
    disabled: false,
    ...overrides,
  }
}

function configureDatabase(updatedRepository = { ...repository }, storedRepository = repository) {
  const updateQuery = createQuery({ data: updatedRepository, error: null })
  const repositoryQuery = createQuery({ data: storedRepository, error: null })
  repositoryQuery.update.mockReturnValue(updateQuery)

  getAdmin.mockReturnValue({
    from(table: string) {
      if (table !== 'repositories') throw new Error(`Unexpected table ${table}`)
      return repositoryQuery
    },
  } as never)

  return { repositoryQuery, updateQuery }
}

function configureServerDatabase(updatedRepository = { ...repository }, storedRepository = repository) {
  const updateQuery = createQuery({ data: updatedRepository, error: null })
  const repositoryQuery = createQuery({ data: storedRepository, error: null })
  repositoryQuery.update.mockReturnValue(updateQuery)

  getServer.mockResolvedValue({
    from(table: string) {
      if (table !== 'repositories') throw new Error(`Unexpected table ${table}`)
      return repositoryQuery
    },
  } as never)

  return { repositoryQuery, updateQuery }
}

beforeEach(() => {
  vi.clearAllMocks()
  listInstallations.mockResolvedValue([installationOld, installationNew] as never)
  getMetadata.mockResolvedValue(githubRepository() as never)
})

describe('repository GitHub synchronization', () => {
  it('resolves a renamed repository by stable id and refreshes mutable metadata', async () => {
    const { updateQuery } = configureDatabase({ ...repository, ...githubRepository() })

    const result = await synchronizeRepositoryForGitHub('repository-1', 'workspace-1')

    expect(getMetadata).toHaveBeenCalledWith(42, 'installation-old', 'workspace-1', 'system')
    expect(updateQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1')
    expect(result.githubRepository.owner).toBe('new-owner')
  })

  it('handles a transfer by trying another active installation in the same workspace', async () => {
    const { repositoryQuery, updateQuery } = configureDatabase({ ...repository, ...githubRepository(), github_installation_id: 'installation-new' })
    getMetadata
      .mockRejectedValueOnce(new GitHubRepositoryError('not_found'))
      .mockResolvedValueOnce(githubRepository({ installationRecordId: 'installation-new' }) as never)

    await synchronizeRepositoryForGitHub('repository-1', 'workspace-1')

    expect(getMetadata).toHaveBeenNthCalledWith(1, 42, 'installation-old', 'workspace-1', 'system')
    expect(getMetadata).toHaveBeenNthCalledWith(2, 42, 'installation-new', 'workspace-1', 'system')
    expect(repositoryQuery.update).toHaveBeenCalledWith(expect.objectContaining({ github_installation_id: 'installation-new' }))
    expect(updateQuery.single).toHaveBeenCalled()
  })

  it('fails closed when the repository was removed from every installation', async () => {
    configureDatabase()
    getMetadata.mockRejectedValue(new GitHubRepositoryError('not_found'))

    const result = synchronizeRepositoryForGitHub('repository-1', 'workspace-1')

    await expect(result).rejects.toMatchObject({ code: 'not_found' })
    await expect(result).rejects.toBeInstanceOf(RepositorySynchronizationError)
  })

  it('does not use an installation outside the requested workspace', async () => {
    configureDatabase()
    listInstallations.mockResolvedValue([
      { ...installationNew, workspace_id: 'workspace-other' },
    ] as never)

    await expect(synchronizeRepositoryForGitHub('repository-1', 'workspace-1'))
      .rejects.toMatchObject({ code: 'not_found' })

    expect(listInstallations).toHaveBeenCalledWith('workspace-1', { access: 'system' })
    expect(getMetadata).not.toHaveBeenCalled()
  })

  it('fails closed for a repository disabled by GitHub', async () => {
    configureDatabase()
    getMetadata.mockResolvedValue(githubRepository({ disabled: true }) as never)

    await expect(synchronizeRepositoryForGitHub('repository-1', 'workspace-1'))
      .rejects.toMatchObject({ code: 'disabled' })
  })

  it('requires the stable repository identity before contacting GitHub', async () => {
    configureDatabase({ ...repository }, { ...repository, github_repository_id: null })

    await expect(synchronizeRepositoryForGitHub('repository-1', 'workspace-1'))
      .rejects.toMatchObject({ code: 'identity_missing' })
    expect(listInstallations).not.toHaveBeenCalled()
    expect(getMetadata).not.toHaveBeenCalled()
  })

  it('uses the same verified installation path for system access as member share creation', async () => {
    configureDatabase({ ...repository, ...githubRepository() })
    const { updateQuery } = configureServerDatabase({ ...repository, ...githubRepository() })

    await expect(synchronizeRepositoryForGitHub('repository-1', 'workspace-1', 'member')).resolves.toMatchObject({
      githubRepository: { githubRepositoryId: 42 },
    })
    await expect(synchronizeRepositoryForGitHub('repository-1', 'workspace-1', 'system')).resolves.toMatchObject({
      githubRepository: { githubRepositoryId: 42 },
    })

    expect(getMetadata).toHaveBeenNthCalledWith(1, 42, 'installation-old', 'workspace-1', 'member')
    expect(getMetadata).toHaveBeenLastCalledWith(42, 'installation-old', 'workspace-1', 'system')
    expect(updateQuery.single).toHaveBeenCalled()
  })
})

function createQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.update.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}
