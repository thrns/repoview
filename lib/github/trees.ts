import 'server-only'

import { getGitHubInstallationClientForInstallation, type GitHubInstallationAccess } from './client'
import { mapGitHubRepositoryError } from './repositories'

export interface GitHubTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

export interface GitHubRawTreeEntry {
  path: string
  mode: string
  type: string
  sha: string
  size?: number
}

type GitHubInstallationClient = Awaited<ReturnType<typeof getGitHubInstallationClientForInstallation>>

export class GitHubTreeTruncatedError extends Error {
  readonly code = 'tree_truncated' as const

  constructor() {
    super('GitHub returned an incomplete repository tree. Narrow the repository scope or try again.')
    this.name = 'GitHubTreeTruncatedError'
  }
}

export async function loadRepositoryTree(
  owner: string,
  repo: string,
  ref: string,
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<GitHubTreeEntry[]> {
  const client = await getGitHubInstallationClientForInstallation(installationRecordId, workspaceId, access)
  const entries = await loadRepositoryTreeEntriesFromClient(client, owner, repo, ref)

  return normalizeGitHubTreeEntries(entries)
}

/** Load only the first-level tree entries for root-file discovery. */
export async function loadRepositoryRootTree(
  owner: string,
  repo: string,
  ref: string,
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<GitHubTreeEntry[]> {
  const client = await getGitHubInstallationClientForInstallation(installationRecordId, workspaceId, access)
  const entries = await loadRepositoryTreeEntriesFromClient(client, owner, repo, ref, false)

  // Keep raw paths here so README blob verification cannot trust a SHA after
  // path normalization changes which tree entry it came from.
  return normalizeGitHubTreeEntries(entries, false)
}

function normalizeGitHubTreeEntries(entries: GitHubRawTreeEntry[], normalizePaths = true) {
  return entries
    .filter((entry): entry is GitHubRawTreeEntry & { type: GitHubTreeEntry['type'] } =>
      entry.type === 'blob' || entry.type === 'tree' || entry.type === 'commit',
    )
    .map((entry) => ({
      path: normalizePaths ? normalizeTreePath(entry.path) : entry.path,
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
      ...(entry.size === undefined ? {} : { size: entry.size }),
    }))
}

/**
 * Loads unmodified tree paths so file readers can verify the exact requested
 * path before trusting an object SHA. UI tree paths are normalized separately.
 */
export async function loadRepositoryTreeEntriesFromClient(
  client: GitHubInstallationClient,
  owner: string,
  repo: string,
  ref: string,
  recursive = true,
): Promise<GitHubRawTreeEntry[]> {
  let data: Awaited<ReturnType<typeof client.rest.git.getTree>>['data']

  try {
    ({ data } = await client.rest.git.getTree({
      owner,
      repo,
      tree_sha: normalizeTreeRef(ref),
      ...(recursive ? { recursive: '1' as const } : {}),
    }))
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }

  if (data.truncated !== false || !Array.isArray(data.tree)) {
    throw new GitHubTreeTruncatedError()
  }

  return data.tree.map((entry) => {
    if (
      !entry
      || typeof entry.path !== 'string'
      || typeof entry.mode !== 'string'
      || typeof entry.type !== 'string'
      || typeof entry.sha !== 'string'
      || (entry.size !== undefined && (!Number.isSafeInteger(entry.size) || entry.size < 0))
    ) {
      throw new GitHubTreeTruncatedError()
    }

    return {
      path: entry.path,
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
      ...(entry.size === undefined ? {} : { size: entry.size }),
    }
  })
}

function normalizeTreeRef(ref: string) {
  const trimmed = ref.trim().replace(/^refs\//, '')
  if (!trimmed) {
    throw new GitHubTreeTruncatedError()
  }

  return trimmed
}

function normalizeTreePath(path: string) {
  const segments: string[] = []

  for (const segment of path.replaceAll('\\', '/').split('/')) {
    if (segment.length === 0 || segment === '.') {
      continue
    }

    if (segment === '..') {
      segments.pop()
      continue
    }

    segments.push(segment)
  }

  return segments.join('/')
}
