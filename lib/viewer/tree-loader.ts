import 'server-only'

import { GitHubRepositoryError } from '@/lib/github/types'
import { GitHubTreeTruncatedError, loadRepositoryTree } from '@/lib/github/trees'
import { filterVisibleTree } from '@/lib/security/visibility'

import { buildViewerTree, type ViewerTreeState } from './tree-model'

export async function loadAuthorizedViewerTree({
  owner,
  repository,
  ref,
  repositoryRules,
  shareRules,
}: {
  owner: string
  repository: string
  ref: string
  repositoryRules: unknown
  shareRules: unknown
}): Promise<ViewerTreeState> {
  try {
    const tree = await loadRepositoryTree(owner, repository, ref)
    const visibleTree = filterVisibleTree(tree, repositoryRules, shareRules)
    return { status: 'ready', nodes: buildViewerTree(visibleTree) }
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof GitHubTreeTruncatedError
        ? 'truncated'
        : error instanceof GitHubRepositoryError && error.code === 'not_found'
          ? 'ref-unavailable'
          : error instanceof GitHubRepositoryError && error.code === 'rate_limited'
            ? 'rate-limited'
            : error instanceof GitHubRepositoryError && (error.code === 'unauthorized' || error.code === 'forbidden')
              ? 'access'
              : 'unavailable',
    }
  }
}
