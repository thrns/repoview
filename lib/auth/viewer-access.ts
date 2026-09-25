import 'server-only'

import { synchronizeRepositoryForGitHub } from '../repositories/synchronize'
import { ViewerAuthorizationError, requireViewerSession } from './viewer-session'

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
    throw new ViewerAuthorizationError()
  }

  let synchronized: Awaited<ReturnType<typeof synchronizeRepositoryForGitHub>>
  try {
    synchronized = await synchronizeRepositoryForGitHub(
      viewer.repository.id,
      viewer.share.workspace_id,
      'system',
    )
  } catch {
    throw new ViewerAuthorizationError()
  }

  if (synchronized.githubRepository.githubRepositoryId !== repositoryId || synchronized.githubRepository.disabled || synchronized.repository.enabled === false) {
    throw new ViewerAuthorizationError()
  }

  return {
    ...viewer,
    repository: synchronized.repository,
    installationRecordId: synchronized.repository.github_installation_id,
    accessibleRepository: synchronized.githubRepository,
  }
}
