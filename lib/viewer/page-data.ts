import 'server-only'

import { headers } from 'next/headers'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { isGlobalPrivacyControl } from '@/lib/viewer/privacy-shared'

import { loadAuthorizedViewerRoot } from './root-loader'
import { loadAuthorizedViewerTree } from './tree-loader'

export async function getViewerPageData(shareIdentifier: string) {
  // Do not memoize private repository content across authorization checks.
  // Every page render starts with a fresh share, workspace, installation, and
  // stable-repository access validation before loading tree or file data.
  const { repository, share, session, installationId, accessibleRepository } = await requireViewerRepositoryAccess(shareIdentifier)
  const requestGpc = isGlobalPrivacyControl((await headers()).get('sec-gpc'))
  const tree = await loadAuthorizedViewerTree({
    owner: accessibleRepository.owner,
    repository: accessibleRepository.name,
    ref: share.ref,
    repositoryRules: repository.default_rules,
    shareRules: share.rules,
    installationId,
  })
  const root = await loadAuthorizedViewerRoot({
    owner: accessibleRepository.owner,
    repository: accessibleRepository.name,
    ref: share.ref,
    tree,
    installationId,
  })

  return {
    shareId: share.share_code ?? shareIdentifier,
    internalShareId: share.id,
    sessionId: session.id,
    repositoryOwner: accessibleRepository.owner,
    repositorySlug: accessibleRepository.name,
    workspaceId: repository.workspace_id,
    installationId,
    repositoryName: accessibleRepository.fullName,
    refName: share.ref,
    allowDownload: share.allow_download,
    analyticsMode: !requestGpc && session.analytics_mode === 'optional' ? 'optional' as const : 'necessary' as const,
    gpcApplied: requestGpc || session.gpc_applied === true,
    repositoryRules: repository.default_rules,
    shareRules: share.rules,
    tree,
    root,
  }
}
