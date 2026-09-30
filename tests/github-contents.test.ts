import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/github/client', () => ({
  getGitHubInstallationClientForInstallation: vi.fn(),
}))

import { getGitHubInstallationClientForInstallation } from '../lib/github/client'
import { isPathAllowedForShare } from '../lib/security/visibility'
import {
  GitHubFileError,
  loadRepositoryAsset,
  loadRepositoryFile,
  MAX_ASSET_PREVIEW_BYTES,
  MAX_TEXT_PREVIEW_BYTES,
} from '../lib/github/contents'
import { loadAuthorizedViewerRoot } from '../lib/viewer/root-loader'
import type { GitHubRawTreeEntry } from '../lib/github/trees'

const getClient = vi.mocked(getGitHubInstallationClientForInstallation)
const getTree = vi.fn()
const getBlob = vi.fn()

const installationRecordId = 'installation-record-id'
const workspaceId = 'workspace-id'
const owner = 'octocat'
const repo = 'hello-world'
const ref = 'main'

function treeEntry(
  path: string,
  options: Partial<GitHubRawTreeEntry> = {},
): GitHubRawTreeEntry {
  return {
    path,
    mode: '100644',
    type: 'blob',
    sha: 'blob-sha',
    size: 0,
    ...options,
  }
}

function configureGitHub(entries: GitHubRawTreeEntry[], bytes = Buffer.from('RepoView source')) {
  getTree.mockResolvedValue({
    data: {
      truncated: false,
      tree: entries.map((entry) => ({ ...entry, url: 'https://provider.invalid/private-tree-url' })),
    },
  })
  getBlob.mockResolvedValue({
    data: {
      sha: entries.find((entry) => entry.type === 'blob')?.sha ?? 'blob-sha',
      size: bytes.length,
      encoding: 'base64',
      content: bytes.toString('base64'),
      url: 'https://provider.invalid/private-blob-url',
      download_url: 'https://provider.invalid/private-download-url',
      token: 'private-provider-token',
    },
  })
  getClient.mockReturnValue({ rest: { git: { getTree, getBlob } } } as never)
}

beforeEach(() => {
  getTree.mockReset()
  getBlob.mockReset()
  getClient.mockReset()
})

describe('GitHub repository file loading', () => {
  it.each(['100644', '100755'])('loads a verified %s blob by the tree SHA', async (mode) => {
    const bytes = Buffer.from('Hello, RepoView!')
    configureGitHub([treeEntry('src/README.md', { mode, sha: 'verified-tree-blob', size: bytes.length })], bytes)
    getBlob.mockResolvedValue({
      data: {
        sha: 'verified-tree-blob',
        size: bytes.length,
        encoding: 'base64',
        content: bytes.toString('base64'),
        url: 'https://provider.invalid/private-blob-url',
        download_url: 'https://provider.invalid/private-download-url',
        token: 'private-provider-token',
      },
    })

    const file = await loadRepositoryFile(owner, repo, '/src/README.md', ref, installationRecordId, workspaceId)

    expect(file).toEqual({ kind: 'text', path: 'src/README.md', size: bytes.length, content: 'Hello, RepoView!' })
    expect(getTree).toHaveBeenCalledWith({
      owner,
      repo,
      tree_sha: 'main',
      recursive: '1',
    })
    expect(getBlob).toHaveBeenCalledWith({
      owner,
      repo,
      file_sha: 'verified-tree-blob',
      headers: { Accept: 'application/vnd.github+json' },
    })
    expect(JSON.stringify(file)).not.toMatch(/provider\.invalid|private-provider-token|verified-tree-blob/)
  })

  it('denies a visible symlink to a hidden .env without fetching either object', async () => {
    configureGitHub([
      treeEntry('docs/config.txt', { mode: '120000', sha: 'symlink-blob', size: 8 }),
      treeEntry('.env', { sha: 'hidden-env-blob', size: 24 }),
    ])
    const repositoryRules = { hidden: ['.env', '**/.env*'], allowOnly: [] }

    expect(isPathAllowedForShare('docs/config.txt', repositoryRules, {})).toBe(true)
    expect(isPathAllowedForShare('.env', repositoryRules, {})).toBe(false)
    await expect(loadRepositoryFile(owner, repo, 'docs/config.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_a_file' })
    expect(getBlob).not.toHaveBeenCalled()
  })

  it('rejects a visible symlink even when its target is visible', async () => {
    configureGitHub([
      treeEntry('docs/config.txt', { mode: '120000', sha: 'symlink-blob', size: 8 }),
      treeEntry('config.txt', { sha: 'visible-target-blob', size: 12 }),
    ])

    await expect(loadRepositoryFile(owner, repo, 'docs/config.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_a_file' })
    expect(getBlob).not.toHaveBeenCalled()
  })

  it('rejects symlink images and symlink downloads', async () => {
    configureGitHub([
      treeEntry('docs/logo.png', { mode: '120000', sha: 'image-link-blob', size: 10 }),
      treeEntry('docs/manual.txt', { mode: '120000', sha: 'download-link-blob', size: 12 }),
    ])

    await expect(loadRepositoryAsset(owner, repo, 'docs/logo.png', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_a_file' })
    await expect(loadRepositoryFile(owner, repo, 'docs/manual.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_a_file' })
    expect(getBlob).not.toHaveBeenCalled()
  })

  it('rejects root README symlinks before rendering their contents', async () => {
    configureGitHub([treeEntry('README.md', { mode: '120000', sha: 'readme-link-blob', size: 8 })])

    await expect(loadAuthorizedViewerRoot({
      owner,
      repository: repo,
      ref,
      installationRecordId,
      workspaceId,
    })).resolves.toEqual({ status: 'unavailable', reason: 'unavailable' })
    expect(getBlob).not.toHaveBeenCalled()
  })

  it('loads a root README from the non-recursive tree entry without waiting for a recursive tree', async () => {
    const bytes = Buffer.from('# Hello')
    configureGitHub([treeEntry('README.md', { sha: 'readme-sha', size: bytes.length })], bytes)
    getBlob.mockResolvedValue({
      data: { sha: 'readme-sha', size: bytes.length, encoding: 'base64', content: bytes.toString('base64') },
    })

    await expect(loadAuthorizedViewerRoot({
      owner,
      repository: repo,
      ref,
      installationRecordId,
      workspaceId,
    })).resolves.toEqual({
      status: 'ready',
      readme: { path: 'README.md', size: bytes.length, content: '# Hello' },
    })

    expect(getTree).toHaveBeenCalledOnce()
    expect(getTree).toHaveBeenCalledWith({ owner, repo, tree_sha: ref })
  })

  it('keeps a missing root README as a valid empty root state', async () => {
    configureGitHub([treeEntry('src/index.ts')])

    await expect(loadAuthorizedViewerRoot({
      owner,
      repository: repo,
      ref,
      installationRecordId,
      workspaceId,
    })).resolves.toEqual({ status: 'ready', readme: null })
    expect(getBlob).not.toHaveBeenCalled()
  })

  it('does not use a normalized root-tree path to fetch a README blob', async () => {
    configureGitHub([treeEntry('/README.md', { sha: 'aliased-readme-sha', size: 8 })])

    await expect(loadAuthorizedViewerRoot({
      owner,
      repository: repo,
      ref,
      installationRecordId,
      workspaceId,
    })).resolves.toEqual({ status: 'unavailable', reason: 'unavailable' })

    expect(getBlob).not.toHaveBeenCalled()
  })

  it('rejects gitlinks, trees, unexpected modes, and unexpected object types', async () => {
    const invalidEntries = [
      treeEntry('vendor/library', { mode: '160000', type: 'commit', sha: 'submodule-sha' }),
      treeEntry('docs', { mode: '040000', type: 'tree', sha: 'tree-sha' }),
      treeEntry('script.sh', { mode: '100600', sha: 'unexpected-mode-sha' }),
      treeEntry('mystery.bin', { type: 'tag', sha: 'unexpected-type-sha' }),
    ]

    for (const entry of invalidEntries) {
      configureGitHub([entry])
      await expect(loadRepositoryFile(owner, repo, entry.path, ref, installationRecordId, workspaceId))
        .rejects.toMatchObject({ code: 'not_a_file' })
    }

    expect(getBlob).not.toHaveBeenCalled()
  })

  it('fails closed for truncated or incomplete trees and absent exact paths', async () => {
    configureGitHub([treeEntry('docs/file.txt')])
    getTree.mockResolvedValueOnce({ data: { truncated: true, tree: [] } })
    await expect(loadRepositoryFile(owner, repo, 'docs/file.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'upstream' })
    expect(getBlob).not.toHaveBeenCalled()

    getTree.mockResolvedValueOnce({ data: { tree: [treeEntry('docs/file.txt')] } })
    await expect(loadRepositoryFile(owner, repo, 'docs/file.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'upstream' })
    expect(getBlob).not.toHaveBeenCalled()

    configureGitHub([])
    await expect(loadRepositoryFile(owner, repo, 'docs/missing.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_found' })
  })

  it('keeps traversal protections and rejects paths before asking GitHub', async () => {
    for (const path of ['../.env', 'docs/../.env', 'docs/%252e%252e/.env', 'docs\\..\\.env']) {
      await expect(loadRepositoryFile(owner, repo, path, ref, installationRecordId, workspaceId))
        .rejects.toBeInstanceOf(GitHubFileError)
      await expect(loadRepositoryFile(owner, repo, path, ref, installationRecordId, workspaceId))
        .rejects.toMatchObject({ code: 'invalid_path' })
    }

    expect(getTree).not.toHaveBeenCalled()
  })

  it('preserves binary and oversized preview behavior', async () => {
    const binary = Buffer.from([65, 0, 66, 67])
    configureGitHub([
      treeEntry('data.txt', { sha: 'binary-blob', size: binary.length }),
      treeEntry('large.txt', { sha: 'large-blob', size: MAX_TEXT_PREVIEW_BYTES + 1 }),
    ], binary)
    getBlob.mockResolvedValueOnce({
      data: { sha: 'binary-blob', size: binary.length, encoding: 'base64', content: binary.toString('base64') },
    })

    await expect(loadRepositoryFile(owner, repo, 'data.txt', ref, installationRecordId, workspaceId))
      .resolves.toMatchObject({ kind: 'unavailable', reason: 'binary' })
    await expect(loadRepositoryFile(owner, repo, 'large.txt', ref, installationRecordId, workspaceId))
      .resolves.toMatchObject({ kind: 'unavailable', reason: 'oversized', size: MAX_TEXT_PREVIEW_BYTES + 1 })
    expect(getBlob).toHaveBeenCalledTimes(1)
  })

  it('loads only allowlisted image assets within the existing size cap', async () => {
    const bytes = Buffer.from('png-bytes')
    configureGitHub([
      treeEntry('docs/diagram.png', { sha: 'diagram-blob', size: bytes.length }),
      treeEntry('docs/readme.txt', { sha: 'text-blob', size: 4 }),
      treeEntry('docs/large.png', { sha: 'large-image-blob', size: MAX_ASSET_PREVIEW_BYTES + 1 }),
    ], bytes)
    getBlob.mockResolvedValue({
      data: { sha: 'diagram-blob', size: bytes.length, encoding: 'base64', content: bytes.toString('base64') },
    })

    await expect(loadRepositoryAsset(owner, repo, 'docs/diagram.png', ref, installationRecordId, workspaceId)).resolves.toMatchObject({
      path: 'docs/diagram.png',
      size: bytes.length,
      mediaType: 'image/png',
      bytes,
    })
    await expect(loadRepositoryAsset(owner, repo, 'docs/readme.txt', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'not_a_file' })
    await expect(loadRepositoryAsset(owner, repo, 'docs/large.png', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ status: 413 })
    expect(getBlob).toHaveBeenCalledTimes(1)
  })

  it('rejects a blob response that does not match the verified tree object', async () => {
    configureGitHub([treeEntry('README.md', { sha: 'tree-blob-sha', size: 4 })])
    getBlob.mockResolvedValue({
      data: { sha: 'different-blob-sha', size: 4, encoding: 'base64', content: Buffer.from('safe').toString('base64') },
    })

    await expect(loadRepositoryFile(owner, repo, 'README.md', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'upstream' })
  })

  it('maps missing blob errors without returning provider error details', async () => {
    configureGitHub([treeEntry('README.md', { sha: 'tree-blob-sha', size: 4 })])
    getBlob.mockRejectedValue({ status: 404, message: 'https://provider.invalid/secret-token' })

    const error = loadRepositoryFile(owner, repo, 'README.md', ref, installationRecordId, workspaceId)
    await expect(error).rejects.toMatchObject({ code: 'not_found' })
    await expect(error).rejects.not.toThrow(/provider\.invalid|secret-token/)
  })

  it('preserves rate limit mapping from the Git tree request', async () => {
    configureGitHub([treeEntry('README.md', { sha: 'tree-blob-sha', size: 4 })])
    getTree.mockRejectedValue({
      status: 403,
      response: { headers: { 'x-ratelimit-remaining': '0' } },
    })

    await expect(loadRepositoryFile(owner, repo, 'README.md', ref, installationRecordId, workspaceId))
      .rejects.toMatchObject({ code: 'rate_limited', status: 403 })
    expect(getBlob).not.toHaveBeenCalled()
  })
})
