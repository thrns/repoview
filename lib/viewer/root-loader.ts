import 'server-only'

import { GitHubFileError, loadRepositoryFile } from '@/lib/github/contents'

import { findRootReadme, type ViewerRootState } from './root-model'
import type { ViewerTreeState } from './tree-model'

export async function loadAuthorizedViewerRoot({
  owner,
  repository,
  ref,
  tree,
}: {
  owner: string
  repository: string
  ref: string
  tree: ViewerTreeState
}): Promise<ViewerRootState> {
  if (tree.status !== 'ready') {
    return {
      status: 'unavailable',
      reason: tree.reason === 'ref-unavailable' || tree.reason === 'rate-limited' || tree.reason === 'access'
        ? tree.reason
        : 'tree',
    }
  }

  const readmeNode = findRootReadme(tree.nodes)
  if (!readmeNode) {
    return { status: 'ready', readme: null }
  }

  try {
    const content = await loadRepositoryFile(owner, repository, readmeNode.path, ref)
    if (content.kind === 'image') {
      return { status: 'unavailable', reason: 'binary' }
    }

    if (content.kind !== 'text') {
      return { status: 'unavailable', reason: content.reason }
    }

    return {
      status: 'ready',
      readme: {
        path: content.path,
        size: content.size,
        content: content.content,
      },
    }
  } catch (error) {
    if (error instanceof GitHubFileError && error.code === 'rate_limited') {
      return { status: 'unavailable', reason: 'rate-limited' }
    }
    if (error instanceof GitHubFileError && (error.code === 'unauthorized' || error.code === 'forbidden')) {
      return { status: 'unavailable', reason: 'access' }
    }
    return { status: 'unavailable', reason: 'unavailable' }
  }
}
