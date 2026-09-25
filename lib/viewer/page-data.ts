import 'server-only'

import { headers } from 'next/headers'

import { requireViewerRepositoryAccess } from '@/lib/auth/viewer-access'
import { isGlobalPrivacyControl } from '@/lib/viewer/privacy-shared'

import { loadAuthorizedViewerRoot } from './root-loader'
import { loadAuthorizedViewerTree } from './tree-loader'
import { logViewerDiagnostic } from './diagnostics'

export async function getViewerPageData(shareIdentifier: string) {
  // Do not memoize private repository content across authorization checks.
  // Every page render starts with a fresh share, workspace, installation, and
  // stable-repository access validation before loading tree or file data.
  const { repository, share, session, installationRecordId, accessibleRepository } = await requireViewerRepositoryAccess(shareIdentifier)
  logViewerDiagnostic('viewer-page-authorization-complete', {
    shareIdentifierType: getShareIdentifierType(shareIdentifier),
    repositoryId: repository.id,
    installationRecordId,
    sessionPresent: Boolean(session.id),
  })
  const requestGpc = isGlobalPrivacyControl((await headers()).get('sec-gpc'))
  const tree = await loadAuthorizedViewerTree({
    owner: accessibleRepository.owner,
    repository: accessibleRepository.name,
    ref: share.ref,
    repositoryRules: repository.default_rules,
    shareRules: share.rules,
    installationRecordId,
    workspaceId: repository.workspace_id,
  })
  const root = await loadAuthorizedViewerRoot({
    owner: accessibleRepository.owner,
    repository: accessibleRepository.name,
    ref: share.ref,
    tree,
    installationRecordId,
    workspaceId: repository.workspace_id,
  })

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

function getShareIdentifierType(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
  if (/^[A-Za-z0-9_-]{8}$/.test(value)) return 'share_code'
  return 'invalid'
}
