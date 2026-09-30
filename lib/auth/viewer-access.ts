import 'server-only'

import { requireViewerSession } from './viewer-session'
import { logViewerDiagnostic } from '../viewer/diagnostics'
import { isShareCode } from '../shares/share-code'

export class ViewerRepositoryAccessError extends Error {
  readonly code = 'viewer_repository_access_unavailable' as const

  constructor(
    public readonly reason: 'repository_unavailable' | 'unavailable',
    cause?: unknown,
  ) {
    super(reason === 'repository_unavailable'
      ? 'The repository for this share is unavailable.'
      : 'The shared repository is temporarily unavailable.')
    this.name = 'ViewerRepositoryAccessError'
    if (cause !== undefined) this.cause = cause
  }
}

/**
 * Authorize from persisted, trusted workspace state. GitHub metadata
 * synchronization belongs to explicit repository-management flows; actual
 * tree and blob calls still verify the active installation before contacting
 * GitHub and fail closed when access has been removed.
 */
export async function requireViewerRepositoryAccess(shareIdentifier: string) {
  const viewer = await requireViewerSession(shareIdentifier)
  const { repository, share } = viewer
  const repositoryId = repository.github_repository_id

  if (!repositoryId || !Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    logViewerDiagnostic('viewer-repository-identity-missing', {
      shareIdentifierType: getShareIdentifierType(shareIdentifier),
    })
    throw new ViewerRepositoryAccessError('repository_unavailable')
  }

  const owner = repository.github_owner.trim()
  const name = repository.github_repo.trim()

  if (
    repository.id !== share.repository_id
    || repository.workspace_id !== share.workspace_id
    || !repository.enabled
    || !repository.github_installation_id
    || !owner
    || !name
  ) {
    logViewerDiagnostic('viewer-repository-access-invariant-failed', {
      shareIdentifierType: getShareIdentifierType(shareIdentifier),
      repositoryMatchesShare: repository.id === share.repository_id,
      repositoryMatchesWorkspace: repository.workspace_id === share.workspace_id,
      repositoryEnabled: repository.enabled,
      installationReferencePresent: Boolean(repository.github_installation_id),
      repositoryLocationPresent: Boolean(owner && name),
    })
    throw new ViewerRepositoryAccessError('repository_unavailable')
  }

  logViewerDiagnostic('viewer-repository-authorized', {
    shareIdentifierType: getShareIdentifierType(shareIdentifier),
    repositoryIdentityMatches: true,
    repositoryEnabled: true,
  })

  return {
    ...viewer,
    installationRecordId: repository.github_installation_id,
    accessibleRepository: {
      githubRepositoryId: repositoryId,
      owner,
      name,
      fullName: `${owner}/${name}`,
    },
  }
}

function getShareIdentifierType(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
  if (isShareCode(value)) return 'share_code'
  return 'invalid'
}
