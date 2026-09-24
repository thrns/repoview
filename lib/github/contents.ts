import 'server-only'

import { getGitHubInstallationClient } from './client'
import { mapGitHubRepositoryError } from './repositories'

export const MAX_TEXT_PREVIEW_BYTES = 1_000_000
export const MAX_ASSET_PREVIEW_BYTES = 5_000_000

const SAFE_ASSET_MEDIA_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

export type GitHubFileContent =
  | {
      kind: 'text'
      path: string
      size: number
      content: string
    }
  | {
      kind: 'image'
      path: string
      size: number
      mediaType: string
    }
  | {
      kind: 'unavailable'
      path: string
      size: number
      reason: 'binary' | 'oversized'
      message: 'Preview unavailable.'
    }

export interface GitHubImageAsset {
  path: string
  size: number
  mediaType: string
  bytes: Buffer
}

export type GitHubFileErrorCode =
  | 'invalid_path'
  | 'not_found'
  | 'not_a_file'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'
  | 'upstream'

export class GitHubFileError extends Error {
  constructor(
    public readonly code: GitHubFileErrorCode,
    public readonly status?: number,
  ) {
    super(getFileErrorMessage(code))
    this.name = 'GitHubFileError'
  }
}

export async function loadRepositoryFile(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  installationId: number,
): Promise<GitHubFileContent> {
  let normalizedPath: string
  try {
    normalizedPath = normalizeFilePath(path)
  } catch {
    throw new GitHubFileError('invalid_path')
  }

  const client = getGitHubInstallationClient(installationId)

  try {
    const { data } = await client.rest.repos.getContent({
      owner,
      repo,
      path: normalizedPath,
      ref: ref.trim(),
      headers: { Accept: 'application/vnd.github+json' },
    })

    if (Array.isArray(data) || data.type !== 'file') {
      throw new GitHubFileError('not_a_file')
    }

    const size = data.size
    if (size > MAX_TEXT_PREVIEW_BYTES) {
      return {
        kind: 'unavailable',
        path: normalizedPath,
        size,
        reason: 'oversized',
        message: 'Preview unavailable.',
      }
    }

    const imageMediaType = getImageMediaType(normalizedPath)
    if (imageMediaType) {
      return {
        kind: 'image',
        path: normalizedPath,
        size,
        mediaType: imageMediaType,
      }
    }

    if (isKnownBinaryPath(normalizedPath)) {
      return {
        kind: 'unavailable',
        path: normalizedPath,
        size,
        reason: 'binary',
        message: 'Preview unavailable.',
      }
    }

    const bytes = decodeContent(data.content, data.encoding)
    if (hasNullByte(bytes)) {
      return {
        kind: 'unavailable',
        path: normalizedPath,
        size,
        reason: 'binary',
        message: 'Preview unavailable.',
      }
    }

    return {
      kind: 'text',
      path: normalizedPath,
      size,
      content: bytes.toString('utf8'),
    }
  } catch (error) {
    if (error instanceof GitHubFileError) {
      throw error
    }

    const mapped = mapGitHubRepositoryError(error)
    const code = mapped.code === 'not_found'
      ? 'not_found'
      : mapped.code === 'unauthorized'
        ? 'unauthorized'
        : mapped.code === 'forbidden'
          ? 'forbidden'
          : mapped.code === 'rate_limited'
            ? 'rate_limited'
            : mapped.code === 'unavailable'
              ? 'unavailable'
              : 'upstream'

    throw new GitHubFileError(code, mapped.status)
  }
}

export async function loadRepositoryAsset(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  installationId: number,
): Promise<GitHubImageAsset> {
  let normalizedPath: string
  try {
    normalizedPath = normalizeFilePath(path)
  } catch {
    throw new GitHubFileError('invalid_path')
  }

  const client = getGitHubInstallationClient(installationId)

  try {
    const { data } = await client.rest.repos.getContent({
      owner,
      repo,
      path: normalizedPath,
      ref: ref.trim(),
      headers: { Accept: 'application/vnd.github+json' },
    })

    if (Array.isArray(data) || data.type !== 'file') {
      throw new GitHubFileError('not_a_file')
    }

    const mediaType = getImageMediaType(normalizedPath)
    if (!mediaType || !SAFE_ASSET_MEDIA_TYPES.has(mediaType)) {
      throw new GitHubFileError('not_a_file')
    }

    if (data.size > MAX_ASSET_PREVIEW_BYTES) {
      throw new GitHubFileError('upstream', 413)
    }

    const bytes = await loadAssetBytes(client, owner, repo, data)
    if (bytes.length > MAX_ASSET_PREVIEW_BYTES) {
      throw new GitHubFileError('upstream', 413)
    }

    return { path: normalizedPath, size: data.size, mediaType, bytes }
  } catch (error) {
    if (error instanceof GitHubFileError) {
      throw error
    }

    const mapped = mapGitHubRepositoryError(error)
    const code = mapped.code === 'not_found'
      ? 'not_found'
      : mapped.code === 'unauthorized'
        ? 'unauthorized'
        : mapped.code === 'forbidden'
          ? 'forbidden'
          : mapped.code === 'rate_limited'
            ? 'rate_limited'
            : mapped.code === 'unavailable'
              ? 'unavailable'
              : 'upstream'

    throw new GitHubFileError(code, mapped.status)
  }
}

async function loadAssetBytes(
  client: ReturnType<typeof getGitHubInstallationClient>,
  owner: string,
  repo: string,
  file: { content?: string; encoding?: string; sha?: string },
) {
  // GitHub's Contents API omits inline content for larger files. Fall back to
  // the authenticated Git Blob API instead of exposing a raw download URL.
  if (file.encoding === 'base64' && typeof file.content === 'string' && file.content.trim()) {
    return decodeContent(file.content, file.encoding)
  }

  if (!file.sha) {
    throw new GitHubFileError('upstream')
  }

  const { data } = await client.rest.git.getBlob({
    owner,
    repo,
    file_sha: file.sha,
    headers: { Accept: 'application/vnd.github+json' },
  })

  return decodeContent(data.content, data.encoding)
}

function normalizeFilePath(path: string) {
  const segments: string[] = []

  for (const segment of path.replaceAll('\\', '/').split('/')) {
    if (segment.length === 0 || segment === '.') {
      continue
    }

    if (segment === '..') {
      throw new Error('File path traversal is not allowed')
    }

    segments.push(segment)
  }

  if (segments.length === 0) {
    throw new Error('File path is required')
  }

  return segments.join('/')
}

function decodeContent(content: string, encoding: string) {
  if (encoding === 'base64') {
    return Buffer.from(content.replaceAll(/\s/g, ''), 'base64')
  }

  return Buffer.from(content, 'utf8')
}

function hasNullByte(bytes: Buffer) {
  const prefix = bytes.subarray(0, Math.min(bytes.length, 8192))
  return prefix.includes(0)
}

function isKnownBinaryPath(path: string) {
  return /\.(7z|avi|bmp|class|dll|dmg|exe|gif|gz|ico|jar|jpeg|jpg|mov|mp3|mp4|otf|pdf|png|so|tar|ttf|woff2?|webm|webp|zip)$/i.test(path)
}

function getImageMediaType(path: string) {
  const extension = path.split('.').at(-1)?.toLocaleLowerCase()
  const mediaTypes: Record<string, string> = {
    avif: 'image/avif',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

  return extension ? mediaTypes[extension] : undefined
}

function getFileErrorMessage(code: GitHubFileErrorCode) {
  switch (code) {
    case 'invalid_path':
      return 'The requested file path is invalid.'
    case 'not_found':
      return 'The requested file was not found.'
    case 'not_a_file':
      return 'The requested path is not a file.'
    case 'unauthorized':
      return 'GitHub App authentication failed.'
    case 'forbidden':
      return 'The GitHub App installation cannot read this file.'
    case 'rate_limited':
      return 'The GitHub API rate limit was reached.'
    case 'unavailable':
      return 'GitHub is temporarily unavailable.'
    case 'upstream':
      return 'GitHub file loading failed.'
  }
}
