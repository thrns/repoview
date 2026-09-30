import 'server-only'

import { getGitHubInstallationClientForInstallation, type GitHubInstallationAccess } from './client'
import { mapGitHubRepositoryError } from './repositories'
import { loadRepositoryTreeEntriesFromClient } from './trees'
import { normalizeRepositoryPath } from '../security/path'
import type { GitHubRawTreeEntry } from './trees'
import { GitHubRepositoryError } from './types'

export const MAX_TEXT_PREVIEW_BYTES = 1_000_000
export const MAX_ASSET_PREVIEW_BYTES = 5_000_000

const SAFE_ASSET_MEDIA_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
])

type VerifiedRepositoryBlobEntry = GitHubRawTreeEntry & {
  mode: '100644' | '100755'
  type: 'blob'
  size: number
}

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
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<GitHubFileContent> {
  const normalizedPath = normalizeFilePath(path)

  const client = await getGitHubInstallationClientForInstallation(installationRecordId, workspaceId, access)

  try {
    const entry = await resolveRepositoryBlobEntry(client, owner, repo, normalizedPath, ref)
    const size = entry.size
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

    const bytes = await loadVerifiedBlobBytes(client, owner, repo, entry)
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

    throw mapGitHubFileError(error)
  }
}

export async function loadRepositoryAsset(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<GitHubImageAsset> {
  const normalizedPath = normalizeFilePath(path)

  const client = await getGitHubInstallationClientForInstallation(installationRecordId, workspaceId, access)

  try {
    const entry = await resolveRepositoryBlobEntry(client, owner, repo, normalizedPath, ref)

    const mediaType = getImageMediaType(normalizedPath)
    if (!mediaType || !SAFE_ASSET_MEDIA_TYPES.has(mediaType)) {
      throw new GitHubFileError('not_a_file')
    }

    if (entry.size > MAX_ASSET_PREVIEW_BYTES) {
      throw new GitHubFileError('upstream', 413)
    }

    const bytes = await loadVerifiedBlobBytes(client, owner, repo, entry)
    if (bytes.length > MAX_ASSET_PREVIEW_BYTES) {
      throw new GitHubFileError('upstream', 413)
    }

    return { path: normalizedPath, size: entry.size, mediaType, bytes }
  } catch (error) {
    if (error instanceof GitHubFileError) {
      throw error
    }

    throw mapGitHubFileError(error)
  }
}

async function resolveRepositoryBlobEntry(
  client: Awaited<ReturnType<typeof getGitHubInstallationClientForInstallation>>,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<VerifiedRepositoryBlobEntry> {
  const entries = await loadRepositoryTreeEntriesFromClient(client, owner, repo, ref)
  const exactEntries = entries.filter((entry) => entry.path === path)

  if (exactEntries.length === 0) {
    throw new GitHubFileError('not_found')
  }

  if (exactEntries.length !== 1) {
    throw new GitHubFileError('not_a_file')
  }

  const entry = exactEntries[0]
  if (entry.type !== 'blob' || (entry.mode !== '100644' && entry.mode !== '100755')) {
    throw new GitHubFileError('not_a_file')
  }

  if (!entry.sha.trim() || entry.size === undefined) {
    throw new GitHubFileError('upstream')
  }

  return {
    ...entry,
    mode: entry.mode,
    type: 'blob',
    size: entry.size,
  }
}

async function loadVerifiedBlobBytes(
  client: Awaited<ReturnType<typeof getGitHubInstallationClientForInstallation>>,
  owner: string,
  repo: string,
  file: { sha: string; size: number },
) {
  const { data } = await client.rest.git.getBlob({
    owner,
    repo,
    file_sha: file.sha,
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (data.sha !== file.sha || data.size !== file.size || typeof data.content !== 'string') {
    throw new GitHubFileError('upstream')
  }

  const bytes = decodeBlobContent(data.content, data.encoding)
  if (bytes.length !== file.size) {
    throw new GitHubFileError('upstream')
  }

  return bytes
}

function normalizeFilePath(path: string) {
  const normalizedPath = normalizeRepositoryPath(path)
  if (!normalizedPath) {
    throw new GitHubFileError('invalid_path')
  }
  return normalizedPath
}

function mapGitHubFileError(error: unknown) {
  const mapped = error instanceof GitHubRepositoryError ? error : mapGitHubRepositoryError(error)
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

  return new GitHubFileError(code, mapped.status)
}

function decodeBlobContent(content: string, encoding: string) {
  if (encoding === 'base64') {
    return Buffer.from(content.replaceAll(/\s/g, ''), 'base64')
  }

  if (encoding === 'utf-8') {
    return Buffer.from(content, 'utf8')
  }

  throw new GitHubFileError('upstream')
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
