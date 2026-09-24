import 'server-only'

import { cache } from 'react'

import { requireViewerSession } from '@/lib/auth/viewer-session'

import { loadAuthorizedViewerRoot } from './root-loader'
import { loadAuthorizedViewerTree } from './tree-loader'

export const getViewerPageData = cache(async (shareIdentifier: string) => {
  const { repository, share, session } = await requireViewerSession(shareIdentifier)
  const tree = await loadAuthorizedViewerTree({
    owner: repository.github_owner,
    repository: repository.github_repo,
    ref: share.ref,
    repositoryRules: repository.default_rules,
    shareRules: share.rules,
    workspaceId: repository.workspace_id,
  })
  const root = await loadAuthorizedViewerRoot({
    owner: repository.github_owner,
    repository: repository.github_repo,
    ref: share.ref,
    tree,
    workspaceId: repository.workspace_id,
  })

  return {
    shareId: share.share_code ?? shareIdentifier,
    internalShareId: share.id,
    sessionId: session.id,
    repositoryOwner: repository.github_owner,
    repositorySlug: repository.github_repo,
    workspaceId: repository.workspace_id,
    repositoryName: `${repository.github_owner}/${repository.github_repo}`,
    refName: share.ref,
    allowDownload: share.allow_download,
    repositoryRules: repository.default_rules,
    shareRules: share.rules,
    tree,
    root,
  }
})
