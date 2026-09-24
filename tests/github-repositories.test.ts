import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/github/client', () => ({
  getGitHubInstallationClient: vi.fn(),
}))

import { getGitHubInstallationClient } from '../lib/github/client'
import {
  getRepositoryMetadata,
  getRepositoryRef,
  listInstallationRepositories,
  listRepositoryBranches,
} from '../lib/github/repositories'
import { GitHubRepositoryError } from '../lib/github/types'

const getClient = vi.mocked(getGitHubInstallationClient)

const repository = {
  id: 42,
  owner: { login: 'octocat' },
  name: 'hello-world',
  full_name: 'octocat/hello-world',
  private: true,
  default_branch: 'main',
  description: 'A private repository',
  html_url: 'https://github.com/octocat/hello-world',
  archived: false,
  disabled: false,
}

describe('GitHub installation repositories', () => {
  it('lists only repositories returned by the installation endpoint and maps a minimal shape', async () => {
    const endpoint = vi.fn()
    const paginate = vi.fn().mockResolvedValue([repository])
    getClient.mockReturnValue({
      paginate,
      rest: { apps: { listReposAccessibleToInstallation: endpoint } },
    } as never)

    await expect(listInstallationRepositories(5678, 'installation-record-id')).resolves.toEqual([{
      id: 42,
      installationRecordId: 'installation-record-id',
      owner: 'octocat',
      name: 'hello-world',
      fullName: 'octocat/hello-world',
      private: true,
      defaultBranch: 'main',
      description: 'A private repository',
      htmlUrl: 'https://github.com/octocat/hello-world',
      archived: false,
      disabled: false,
    }])
    expect(paginate).toHaveBeenCalledWith(endpoint, { per_page: 100 })
  })

  it('fetches repository metadata and maps the default branch', async () => {
    const get = vi.fn().mockResolvedValue({ data: repository })
    getClient.mockReturnValue({ rest: { repos: { get } } } as never)

    await expect(getRepositoryMetadata('octocat', 'hello-world', 5678, 'installation-record-id')).resolves.toMatchObject({
      fullName: 'octocat/hello-world',
      defaultBranch: 'main',
    })
    expect(get).toHaveBeenCalledWith({ owner: 'octocat', repo: 'hello-world' })
  })

  it('lists branch refs and validates a selected ref through GitHub', async () => {
    const branchEndpoint = vi.fn()
    const getRef = vi.fn().mockResolvedValue({
      data: {
        ref: 'refs/heads/main',
        object: { sha: 'abc123', type: 'commit' },
      },
    })
    const paginate = vi.fn().mockResolvedValue([{ name: 'main', commit: { sha: 'abc123' }, protected: true }])
    getClient.mockReturnValue({
      paginate,
      rest: {
        repos: { listBranches: branchEndpoint },
        git: { getRef },
      },
    } as never)

    await expect(listRepositoryBranches('octocat', 'hello-world', 5678)).resolves.toEqual([
      { name: 'main', sha: 'abc123', protected: true },
    ])
    await expect(getRepositoryRef('octocat', 'hello-world', 'refs/heads/main', 5678)).resolves.toEqual({
      name: 'heads/main',
      ref: 'refs/heads/main',
      sha: 'abc123',
      type: 'commit',
    })
    expect(paginate).toHaveBeenCalledWith(branchEndpoint, {
      owner: 'octocat',
      repo: 'hello-world',
      per_page: 100,
    })
    expect(getRef).toHaveBeenCalledWith({ owner: 'octocat', repo: 'hello-world', ref: 'heads/main' })
  })

  it.each([
    [{ status: 401 }, 'unauthorized'],
    [{ status: 403 }, 'forbidden'],
    [{ status: 403, response: { headers: { 'x-ratelimit-remaining': '0', 'retry-after': '12' } } }, 'rate_limited'],
  ] as const)('maps GitHub error %j to %s', async (error, code) => {
    getClient.mockReturnValue({
      paginate: vi.fn().mockRejectedValue(error),
      rest: { apps: { listReposAccessibleToInstallation: vi.fn() } },
    } as never)

    const result = listInstallationRepositories(5678, 'installation-record-id')

    await expect(result).rejects.toMatchObject({ code })
    await expect(result).rejects.toBeInstanceOf(GitHubRepositoryError)
  })
})
