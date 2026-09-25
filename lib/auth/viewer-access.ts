import 'server-only'

import { RepositorySynchronizationError, synchronizeRepositoryForGitHub } from '../repositories/synchronize'
import { requireViewerSession } from './viewer-session'
import { logViewerDiagnostic, summarizeViewerError } from '../viewer/diagnostics'

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
 * Authorize a viewer request all the way through the current GitHub App
 * installation state before any repository content is loaded.
 *
 * The current GitHub location is intentionally resolved by the stable
 * repository id. Owner/name values are mutable display metadata and must not
 * be used as the access-control key.
 */
export async function requireViewerRepositoryAccess(shareIdentifier: string) {
  const viewer = await requireViewerSession(shareIdentifier)
  const repositoryId = viewer.repository.github_repository_id

  if (!repositoryId || !Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    logViewerDiagnostic('viewer-repository-identity-missing', {
      shareIdentifierType: getShareIdentifierType(shareIdentifier),
    })
    throw new ViewerRepositoryAccessError('repository_unavailable')
  }

  let synchronized: Awaited<ReturnType<typeof synchronizeRepositoryForGitHub>>
  try {
    synchronized = await synchronizeRepositoryForGitHub(
      viewer.repository.id,
      viewer.share.workspace_id,
      'system',
    )
  } catch (error) {
    logViewerDiagnostic('viewer-repository-synchronization-failed', {
      shareIdentifierType: getShareIdentifierType(shareIdentifier),
      repositoryIdentityPresent: true,
      error: summarizeViewerError(error).message,
    })
    throw new ViewerRepositoryAccessError(
      error instanceof RepositorySynchronizationError && error.code !== 'unavailable'
        ? 'repository_unavailable'
        : 'unavailable',
      error,
    )
  }

  if (synchronized.githubRepository.githubRepositoryId !== repositoryId || synchronized.githubRepository.disabled || synchronized.repository.enabled === false) {
    logViewerDiagnostic('viewer-repository-access-invariant-failed', {
      shareIdentifierType: getShareIdentifierType(shareIdentifier),
      repositoryIdentityMatches: synchronized.githubRepository.githubRepositoryId === repositoryId,
      githubRepositoryDisabled: synchronized.githubRepository.disabled,
      repositoryEnabled: synchronized.repository.enabled,
    })
    throw new ViewerRepositoryAccessError('repository_unavailable')
  }

  logViewerDiagnostic('viewer-repository-authorized', {
    shareIdentifierType: getShareIdentifierType(shareIdentifier),
    repositoryIdentityMatches: true,
    githubRepositoryDisabled: false,
    repositoryEnabled: true,
  })

  return {
    ...viewer,
    repository: synchronized.repository,
    installationRecordId: synchronized.repository.github_installation_id,
    accessibleRepository: synchronized.githubRepository,
  }
}

function getShareIdentifierType(value: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
  if (/^[A-Za-z0-9_-]{8}$/.test(value)) return 'share_code'
  return 'invalid'
}
