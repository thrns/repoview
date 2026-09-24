import 'server-only'

import { getGitHubInstallationIdForRepository } from '../github/client'
import { listInstallationRepositories } from '../github/repositories'
import { ViewerAuthorizationError, requireViewerSession } from './viewer-session'

/**
 * Authorize a viewer request all the way through the current GitHub App
 * installation state before any repository content is loaded.
 *
 * The installation repository listing is intentionally resolved by the stable
 * GitHub repository id. Owner/name values are mutable display metadata and
 * must not be used as the access-control key.
 */
export async function requireViewerRepositoryAccess(shareIdentifier: string) {
  const viewer = await requireViewerSession(shareIdentifier)
  const repositoryId = viewer.repository.github_repository_id

  if (!repositoryId || !Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
    throw new ViewerAuthorizationError()
  }

  let installationId: number
  try {
    installationId = await getGitHubInstallationIdForRepository(
      viewer.repository.id,
      viewer.share.workspace_id,
    )
  } catch {
    throw new ViewerAuthorizationError()
  }

  let accessibleRepository: Awaited<ReturnType<typeof listInstallationRepositories>>[number] | undefined
  try {
    const accessibleRepositories = await listInstallationRepositories(
      installationId,
      viewer.repository.github_installation_id,
    )
    accessibleRepository = accessibleRepositories.find(
      (candidate) => candidate.githubRepositoryId === repositoryId && !candidate.disabled,
    )
  } catch {
    throw new ViewerAuthorizationError()
  }

  if (!accessibleRepository) {
    throw new ViewerAuthorizationError()
  }

  return {
    ...viewer,
    installationId,
    accessibleRepository,
  }
}
