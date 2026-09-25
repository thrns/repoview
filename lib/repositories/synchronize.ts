import 'server-only'

import { requireWorkspaceMember } from '../auth/workspace'
import {
  listWorkspaceGitHubInstallations,
  type GitHubInstallationAccess,
} from '../github/client'
import {
  getRepositoryMetadataById,
} from '../github/repositories'
import { GitHubRepositoryError, type GitHubRepositorySummary } from '../github/types'
import { createSupabaseAdminClient } from '../supabase/admin'
import { createSupabaseServerClient } from '../supabase/server'
import type { Tables, TablesUpdate } from '../supabase/database.types'
import { logViewerDiagnostic, summarizeViewerError } from '../viewer/diagnostics'

export type RepositorySynchronizationCode =
  | 'identity_missing'
  | 'not_found'
  | 'access'
  | 'disabled'
  | 'unavailable'

export class RepositorySynchronizationError extends Error {
  constructor(public readonly code: RepositorySynchronizationCode) {
    super(getSynchronizationMessage(code))
    this.name = 'RepositorySynchronizationError'
  }
}

export type SynchronizedRepository = {
  repository: Tables<'repositories'>
  githubRepository: GitHubRepositorySummary
}

/**
 * Resolve a registered repository by GitHub's stable numeric identity before
 * any branch, ref, or content operation. Mutable owner/name metadata is only
 * used after this lookup succeeds, and is refreshed when a repository was
 * renamed, transferred, or moved to another active installation in the same
 * workspace.
 */
export async function synchronizeRepositoryForGitHub(
  repositoryId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<SynchronizedRepository> {
  logViewerDiagnostic('repository-sync-start', {
    access,
    repositoryId,
    workspaceId,
  })

  if (access === 'member') {
    await requireWorkspaceMember(workspaceId)
  }

  const supabase = access === 'member'
    ? await createSupabaseServerClient()
    : createSupabaseAdminClient()
  const { data: repository, error: repositoryError } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (repositoryError || !repository) {
    logViewerDiagnostic('repository-sync-record-missing', {
      access,
      repositoryId,
      workspaceId,
      databaseError: Boolean(repositoryError),
      recordPresent: Boolean(repository),
      ...(repositoryError ? { error: summarizeViewerError(repositoryError).message } : {}),
    })
    throw new RepositorySynchronizationError('not_found')
  }

  if (!repository.github_repository_id || !Number.isSafeInteger(repository.github_repository_id) || repository.github_repository_id <= 0) {
    logViewerDiagnostic('repository-sync-identity-missing', {
      access,
      repositoryId,
      workspaceId,
    })
    throw new RepositorySynchronizationError('identity_missing')
  }

  let installations: Awaited<ReturnType<typeof listWorkspaceGitHubInstallations>>
  try {
    installations = await listWorkspaceGitHubInstallations(workspaceId, { access })
  } catch (error) {
    logViewerDiagnostic('repository-sync-installations-failed', {
      access,
      repositoryId,
      workspaceId,
      error: summarizeViewerError(error).message,
    })
    throw error
  }

  logViewerDiagnostic('repository-sync-installations-loaded', {
    access,
    repositoryId,
    workspaceId,
    installationCount: installations.length,
  })

  if (installations.length === 0) {
    throw new RepositorySynchronizationError('access')
  }

  // The repository's current installation is the first candidate. This keeps
  // the public viewer on the same verified GitHub App installation used by
  // share creation while still allowing transfers to another active
  // installation in the workspace to recover below.
  const orderedInstallations = [...installations].sort((left, right) => {
    const leftIsCurrent = left.id === repository.github_installation_id
    const rightIsCurrent = right.id === repository.github_installation_id
    return Number(rightIsCurrent) - Number(leftIsCurrent)
  })

  let sawAccessFailure = false
  for (const [installationIndex, installation] of orderedInstallations.entries()) {
    if (installation.workspace_id !== workspaceId) continue

    logViewerDiagnostic('repository-sync-installation-check', {
      access,
      repositoryId,
      workspaceId,
      installationIndex,
      isCurrentInstallation: installation.id === repository.github_installation_id,
    })

    let githubRepository: GitHubRepositorySummary
    try {
      githubRepository = await getRepositoryMetadataById(
        repository.github_repository_id,
        installation.id,
        workspaceId,
        access,
      )
    } catch (error) {
      logViewerDiagnostic('repository-sync-installation-failed', {
        access,
        repositoryId,
        workspaceId,
        installationIndex,
        error: summarizeViewerError(error).message,
      })
      if (error instanceof GitHubRepositoryError && error.code === 'not_found') continue
      if (error instanceof GitHubRepositoryError && (error.code === 'forbidden' || error.code === 'unauthorized')) {
        sawAccessFailure = true
        continue
      }
      throw new RepositorySynchronizationError('unavailable')
    }

    if (githubRepository.disabled) {
      logViewerDiagnostic('repository-sync-github-disabled', {
        access,
        repositoryId,
        workspaceId,
        installationIndex,
      })
      throw new RepositorySynchronizationError('disabled')
    }

    const update: TablesUpdate<'repositories'> = {
      github_installation_id: installation.id,
      github_repository_id: githubRepository.githubRepositoryId,
      github_node_id: githubRepository.githubNodeId,
      github_owner: githubRepository.owner,
      github_repo: githubRepository.name,
      default_branch: githubRepository.defaultBranch,
    }
    const { data: synchronized, error: updateError } = await supabase
      .from('repositories')
      .update(update)
      .eq('id', repository.id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single()

    if (updateError || !synchronized) {
      logViewerDiagnostic('repository-sync-record-update-failed', {
        access,
        repositoryId,
        workspaceId,
        installationIndex,
        databaseError: Boolean(updateError),
        recordPresent: Boolean(synchronized),
        ...(updateError ? { error: summarizeViewerError(updateError).message } : {}),
      })
      throw new RepositorySynchronizationError('unavailable')
    }

    logViewerDiagnostic('repository-sync-success', {
      access,
      repositoryId,
      workspaceId,
      installationIndex,
      githubRepositoryIdentityMatches: synchronized.github_repository_id === repository.github_repository_id,
    })

    return {
      repository: synchronized as Tables<'repositories'>,
      githubRepository,
    }
  }

  throw new RepositorySynchronizationError(sawAccessFailure ? 'access' : 'not_found')
}

function getSynchronizationMessage(code: RepositorySynchronizationCode) {
  switch (code) {
    case 'identity_missing':
      return 'This repository is missing its stable GitHub identity. Run the repository identity migration before creating shares.'
    case 'not_found':
      return 'This repository is no longer accessible to the configured GitHub App installation.'
    case 'access':
      return 'The configured GitHub App installation cannot access this repository.'
    case 'disabled':
      return 'GitHub has disabled this repository.'
    case 'unavailable':
      return 'RepoView could not synchronize the current GitHub repository location.'
  }
}
