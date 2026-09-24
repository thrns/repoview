import 'server-only'

import { getGitHubInstallationClient } from './client'
import { mapGitHubRepositoryError } from './repositories'

export interface GitHubTreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

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
): Promise<GitHubTreeEntry[]> {
  const client = getGitHubInstallationClient()
  let data: Awaited<ReturnType<typeof client.rest.git.getTree>>['data']

  try {
    ({ data } = await client.rest.git.getTree({
      owner,
      repo,
      tree_sha: normalizeTreeRef(ref),
      recursive: '1',
    }))
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }

  if (data.truncated) {
    throw new GitHubTreeTruncatedError()
  }

  return data.tree
    .filter((entry): entry is typeof entry & { type: 'blob' | 'tree' | 'commit' } =>
      entry.type === 'blob' || entry.type === 'tree' || entry.type === 'commit',
    )
    .map((entry) => ({
      path: normalizeTreePath(entry.path),
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
      ...(entry.size === undefined ? {} : { size: entry.size }),
    }))
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
