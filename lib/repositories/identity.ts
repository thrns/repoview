import type { GitHubRepositorySummary } from '../github/types'
import type { RepositoryRecord } from './registry'

export type RepositoryIdentityRecord = Pick<
  RepositoryRecord,
  'github_repository_id' | 'github_installation_id' | 'github_owner' | 'github_repo'
>

export function findRegisteredRepository<T extends RepositoryIdentityRecord>(
  repositories: T[],
  githubRepository: Pick<GitHubRepositorySummary, 'githubRepositoryId' | 'installationRecordId' | 'owner' | 'name'>,
) {
  const stableMatch = repositories.find((repository) =>
    repository.github_repository_id === githubRepository.githubRepositoryId,
  )
  if (stableMatch) return stableMatch

  // This fallback exists only for rows created before the one-time identity
  // migration has populated github_repository_id. Once populated, renames and
  // transfers always resolve through the stable GitHub repository id above.
  return repositories.find((repository) =>
    repository.github_repository_id === null
      && repository.github_installation_id === githubRepository.installationRecordId
      && repository.github_owner === githubRepository.owner
      && repository.github_repo === githubRepository.name,
  ) ?? null
}
