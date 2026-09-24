import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('../lib/github/client', () => ({
  getGitHubInstallationClient: vi.fn(),
}))

import { getGitHubInstallationClient } from '../lib/github/client'
import {
  GitHubFileError,
  loadRepositoryAsset,
  loadRepositoryFile,
  MAX_ASSET_PREVIEW_BYTES,
  MAX_TEXT_PREVIEW_BYTES,
} from '../lib/github/contents'

const getClient = vi.mocked(getGitHubInstallationClient)

describe('GitHub repository file loading', () => {
  it('fetches text server-side, decodes it, and does not return provider URLs', async () => {
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: 'file',
        size: 13,
        encoding: 'base64',
        content: Buffer.from('Hello, RepoView!').toString('base64'),
        download_url: 'temporary-private-url',
      },
    })
    getClient.mockReturnValue({ rest: { repos: { getContent } } } as never)

    await expect(loadRepositoryFile('octocat', 'hello-world', '/src/README.md', 'main')).resolves.toEqual({
      kind: 'text',
      path: 'src/README.md',
      size: 13,
      content: 'Hello, RepoView!',
    })
    expect(getContent).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
      path: 'src/README.md',
      ref: 'main',
      headers: { Accept: 'application/vnd.github+json' },
    })
  })

  it('returns an explicit image result and unavailable result for binary and oversized files', async () => {
    const getContent = vi.fn()
      .mockResolvedValueOnce({ data: { type: 'file', size: 12, encoding: 'base64', content: 'not-decoded' } })
      .mockResolvedValueOnce({ data: { type: 'file', size: MAX_TEXT_PREVIEW_BYTES + 1, encoding: 'none', content: '' } })
    getClient.mockReturnValue({ rest: { repos: { getContent } } } as never)

    await expect(loadRepositoryFile('octocat', 'hello-world', 'logo.png', 'main')).resolves.toEqual({
      kind: 'image',
      path: 'logo.png',
      size: 12,
      mediaType: 'image/png',
    })
    await expect(loadRepositoryFile('octocat', 'hello-world', 'large.txt', 'main')).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'oversized',
      message: 'Preview unavailable.',
    })
  })

  it('detects NUL bytes and maps missing files without exposing provider errors', async () => {
    const getContent = vi.fn()
      .mockResolvedValueOnce({
        data: {
          type: 'file',
          size: 4,
          encoding: 'base64',
          content: Buffer.from([65, 0, 66, 67]).toString('base64'),
        },
      })
      .mockRejectedValueOnce({ status: 404 })
    getClient.mockReturnValue({ rest: { repos: { getContent } } } as never)

    await expect(loadRepositoryFile('octocat', 'hello-world', 'data.txt', 'main')).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'binary',
    })
    const missingFile = loadRepositoryFile('octocat', 'hello-world', 'missing.txt', 'main')
    await expect(missingFile).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(missingFile).rejects.toBeInstanceOf(
      GitHubFileError,
    )
  })

  it('loads only allowlisted image assets within the protected size cap', async () => {
    const bytes = Buffer.from('png-bytes')
    const getContent = vi.fn()
      .mockResolvedValueOnce({ data: { type: 'file', size: bytes.length, encoding: 'base64', content: bytes.toString('base64') } })
      .mockResolvedValueOnce({ data: { type: 'file', size: 4, encoding: 'base64', content: Buffer.from('text').toString('base64') } })
      .mockResolvedValueOnce({ data: { type: 'file', size: MAX_ASSET_PREVIEW_BYTES + 1, encoding: 'none', content: '' } })
    getClient.mockReturnValue({ rest: { repos: { getContent } } } as never)

    await expect(loadRepositoryAsset('octocat', 'hello-world', 'docs/diagram.png', 'main')).resolves.toMatchObject({
      path: 'docs/diagram.png',
      size: bytes.length,
      mediaType: 'image/png',
      bytes,
    })
    await expect(loadRepositoryAsset('octocat', 'hello-world', 'docs/readme.txt', 'main')).rejects.toMatchObject({ code: 'not_a_file' })
    await expect(loadRepositoryAsset('octocat', 'hello-world', 'docs/large.png', 'main')).rejects.toMatchObject({ status: 413 })
  })

  it('falls back to the authenticated Git Blob API when Contents omits inline image bytes', async () => {
    const bytes = Buffer.from('large-png-bytes')
    const getContent = vi.fn().mockResolvedValue({
      data: {
        type: 'file',
        size: 2 * 1024 * 1024,
        encoding: 'none',
        sha: 'blob-sha',
      },
    })
    const getBlob = vi.fn().mockResolvedValue({
      data: {
        encoding: 'base64',
        content: bytes.toString('base64'),
      },
    })
    getClient.mockReturnValue({ rest: { repos: { getContent }, git: { getBlob } } } as never)

    await expect(loadRepositoryAsset('octocat', 'hello-world', 'docs/large.png', 'main')).resolves.toMatchObject({
      path: 'docs/large.png',
      mediaType: 'image/png',
      bytes,
    })
    expect(getBlob).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
      file_sha: 'blob-sha',
      headers: { Accept: 'application/vnd.github+json' },
    })
  })
})
