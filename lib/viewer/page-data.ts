import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { isGlobalPrivacyControl } from '@/lib/viewer/privacy-shared'
import { isShareCode } from '../shares/share-code'

import { loadAuthorizedViewerRoot } from './root-loader'
import { loadAuthorizedViewerTree } from './tree-loader'
import { logViewerDiagnostic } from './diagnostics'

async function getViewerPageDataUncached(shareIdentifier: string) {
  const { repository, share, session, installationRecordId, accessibleRepository } = await requireViewerRepositoryAccess(shareIdentifier)
  logViewerDiagnostic('viewer-page-authorization-complete', {
    shareIdentifierType: getShareIdentifierType(shareIdentifier),
    repositoryId: repository.id,
    installationRecordId,
    sessionPresent: Boolean(session.id),
  })
  const requestGpc = isGlobalPrivacyControl((await headers()).get('sec-gpc'))
  const [tree, root] = await Promise.all([
    loadAuthorizedViewerTree({
      owner: accessibleRepository.owner,
      repository: accessibleRepository.name,
      ref: share.ref,
      repositoryRules: repository.default_rules,
      shareRules: share.rules,
      installationRecordId,
      workspaceId: repository.workspace_id,
    }),
    loadAuthorizedViewerRoot({
      owner: accessibleRepository.owner,
      repository: accessibleRepository.name,
      ref: share.ref,
      installationRecordId,
      workspaceId: repository.workspace_id,
    }),
  ])

  logViewerDiagnostic('viewer-page-data-loaded', {
    shareIdentifierType: getShareIdentifierType(shareIdentifier),
    treeStatus: tree.status,
    rootStatus: root.status,
  })

  return {
    shareId: share.share_code ?? shareIdentifier,
    internalShareId: share.id,
    sessionId: session.id,
    repositoryOwner: accessibleRepository.owner,
    repositorySlug: accessibleRepository.name,
    workspaceId: repository.workspace_id,
    installationRecordId,
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

// React scopes this memoization to one server render request. The cached value
// is never reused to authorize a later HTTP request.
export const getViewerPageData = cache(getViewerPageDataUncached)

function getShareIdentifierType(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
  if (isShareCode(value)) return 'share_code'
  return 'invalid'
}
