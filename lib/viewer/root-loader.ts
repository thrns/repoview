import 'server-only'

import { GitHubFileError, loadRepositoryFileFromTreeEntry } from '@/lib/github/contents'
import { GitHubTreeTruncatedError, loadRepositoryRootTree } from '@/lib/github/trees'
import { GitHubRepositoryError } from '@/lib/github/types'
import { buildViewerTree } from './tree-model'

import { findRootReadme, type ViewerRootState } from './root-model'

export async function loadAuthorizedViewerRoot({
  owner,
  repository,
  ref,
  installationRecordId,
  workspaceId,
}: {
  owner: string
  repository: string
  ref: string
  installationRecordId: string
  workspaceId: string
}): Promise<ViewerRootState> {
  try {
    const rootTree = await loadRepositoryRootTree(owner, repository, ref, installationRecordId, workspaceId, 'system')
    const readmeNode = findRootReadme(buildViewerTree(rootTree))
    if (!readmeNode) {
      return { status: 'ready', readme: null }
    }

    const matchingEntries = rootTree.filter((entry) => entry.path === readmeNode.path)
    if (matchingEntries.length !== 1) {
      return { status: 'unavailable', reason: 'unavailable' }
    }

    const content = await loadRepositoryFileFromTreeEntry(
      owner,
      repository,
      readmeNode.path,
      matchingEntries[0],
      installationRecordId,
      workspaceId,
      'system',
    )
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
    if (error instanceof GitHubTreeTruncatedError) {
      return { status: 'unavailable', reason: 'tree' }
    }
    if (error instanceof GitHubRepositoryError && error.code === 'not_found') {
      return { status: 'unavailable', reason: 'ref-unavailable' }
    }
    if (error instanceof GitHubRepositoryError && error.code === 'rate_limited') {
      return { status: 'unavailable', reason: 'rate-limited' }
    }
    if (error instanceof GitHubRepositoryError && (error.code === 'unauthorized' || error.code === 'forbidden')) {
      return { status: 'unavailable', reason: 'access' }
    }
    if (error instanceof GitHubFileError && error.code === 'rate_limited') {
      return { status: 'unavailable', reason: 'rate-limited' }
    }
    if (error instanceof GitHubFileError && (error.code === 'unauthorized' || error.code === 'forbidden')) {
      return { status: 'unavailable', reason: 'access' }
    }
    return { status: 'unavailable', reason: 'unavailable' }
  }
}
