import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/github/client', () => ({
  getGitHubInstallationClient: vi.fn(),
}))

import { getGitHubInstallationClient } from '../lib/github/client'
import { loadRepositoryTree, GitHubTreeTruncatedError } from '../lib/github/trees'

const getClient = vi.mocked(getGitHubInstallationClient)

describe('GitHub repository trees', () => {
  it('loads a recursive tree and normalizes returned paths', async () => {
    const getTree = vi.fn().mockResolvedValue({
      data: {
        truncated: false,
        tree: [
          { path: '/src\\main.ts', mode: '100644', type: 'blob', sha: 'blob-sha', size: 42, url: 'private-api-url' },
          { path: 'src/./components', mode: '040000', type: 'tree', sha: 'tree-sha', url: 'private-api-url' },
          { path: 'src/../ignored', mode: '100644', type: 'blob', sha: 'ignored-sha' },
          { path: 'submodule', mode: '160000', type: 'commit', sha: 'commit-sha' },
        ],
      },
    })
    getClient.mockReturnValue({ rest: { git: { getTree } } } as never)

    await expect(loadRepositoryTree('octocat', 'hello-world', 'refs/heads/main', 5678)).resolves.toEqual([
      { path: 'src/main.ts', mode: '100644', type: 'blob', sha: 'blob-sha', size: 42 },
      { path: 'src/components', mode: '040000', type: 'tree', sha: 'tree-sha' },
      { path: 'ignored', mode: '100644', type: 'blob', sha: 'ignored-sha' },
      { path: 'submodule', mode: '160000', type: 'commit', sha: 'commit-sha' },
    ])
    expect(getTree).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
      tree_sha: 'heads/main',
      recursive: '1',
    })
  })

  it('fails explicitly when GitHub returns a truncated tree', async () => {
    const getTree = vi.fn().mockResolvedValue({ data: { truncated: true, tree: [] } })
    getClient.mockReturnValue({ rest: { git: { getTree } } } as never)

    await expect(loadRepositoryTree('octocat', 'hello-world', 'main', 5678)).rejects.toBeInstanceOf(
      GitHubTreeTruncatedError,
    )
  })
})
