import 'server-only'

import { requireRepositoryAccess, requireWorkspace, requireWorkspaceAdmin, requireWorkspaceRole } from '../auth/workspace'
import type { GitHubRepositorySummary } from '../github/types'
import { findRegisteredRepository } from './identity'
import { createSupabaseServerClient } from '../supabase/server'
import type { VisibilityRules } from '../security/visibility'
import type { Tables } from '../supabase/database.types'
import { assertWorkspaceResourceQuota } from '../security/quotas'

export type RepositoryRecord = Tables<'repositories'>

export async function listRegisteredRepositories(): Promise<RepositoryRecord[]> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('github_owner', { ascending: true })
    .order('github_repo', { ascending: true })

  if (error) {
    throw new Error('RepoView repository records could not be loaded.')
  }

  return data ?? []
}

/**
 * Refresh mutable GitHub location metadata for repositories already registered
 * in the workspace. The stable GitHub ID is the lookup key, so this preserves
 * the RepoView UUID and all share references across renames and transfers.
 */
export async function syncRegisteredRepositoryMetadata(
  githubRepositories: GitHubRepositorySummary[],
  registeredRepositories: RepositoryRecord[],
) {
  const { workspace } = await requireWorkspaceAdmin()
  const supabase = await createSupabaseServerClient()

  await Promise.all(githubRepositories.map(async (githubRepository) => {
    const existing = findRegisteredRepository(registeredRepositories, githubRepository)
    if (!existing) return

    const { error } = await supabase
      .from('repositories')
      .update({
        github_installation_id: githubRepository.installationRecordId,
        github_repository_id: githubRepository.githubRepositoryId,
        github_node_id: githubRepository.githubNodeId,
        github_owner: githubRepository.owner,
        github_repo: githubRepository.name,
        default_branch: githubRepository.defaultBranch,
      })
      .eq('id', existing.id)
      .eq('workspace_id', workspace.id)

    if (error) {
      throw new Error('RepoView could not synchronize GitHub repository metadata.')
    }
  }))
}

export async function saveRepositoryRecord(input: {
  githubInstallationId: string
  githubRepositoryId: number
  githubNodeId: string
  githubOwner: string
  githubRepo: string
  defaultBranch: string
  enabled: boolean
  defaultRules?: VisibilityRules
  existingRepositoryId?: string
}) {
  const { workspace } = await requireWorkspaceAdmin()
  const supabase = await createSupabaseServerClient()
  const { data: installation, error: installationError } = await supabase
    .from('github_installations')
    .select('id')
    .eq('id', input.githubInstallationId)
    .eq('workspace_id', workspace.id)
    .eq('status', 'active')
    .maybeSingle()

  if (installationError || !installation) {
    throw new Error('RepoView could not verify the GitHub App installation for this workspace.')
  }

  if (input.enabled) {
    const existing = input.existingRepositoryId
      ? await supabase
        .from('repositories')
        .select('enabled')
        .eq('id', input.existingRepositoryId)
        .eq('workspace_id', workspace.id)
        .maybeSingle()
      : { data: null, error: null }
    if (existing.error) throw new Error('RepoView could not inspect this repository record.')
    if (!existing.data?.enabled) await assertWorkspaceResourceQuota('enabled-repositories', workspace.id)
  }

  const repositoryFields = {
    workspace_id: workspace.id,
    github_installation_id: input.githubInstallationId,
    github_repository_id: input.githubRepositoryId,
    github_node_id: input.githubNodeId,
    github_owner: input.githubOwner,
    github_repo: input.githubRepo,
    default_branch: input.defaultBranch,
    enabled: input.enabled,
    ...(input.defaultRules ? {
      default_rules: {
        hidden: [...input.defaultRules.hidden],
        allowOnly: [...input.defaultRules.allowOnly],
      },
    } : {}),
  }
  const repositoryUpdate = {
    github_installation_id: input.githubInstallationId,
    github_repository_id: input.githubRepositoryId,
    github_node_id: input.githubNodeId,
    github_owner: input.githubOwner,
    github_repo: input.githubRepo,
    default_branch: input.defaultBranch,
    enabled: input.enabled,
    ...(input.defaultRules ? {
      default_rules: {
        hidden: [...input.defaultRules.hidden],
        allowOnly: [...input.defaultRules.allowOnly],
      },
    } : {}),
  }

  const query = input.existingRepositoryId
    ? supabase
      .from('repositories')
      .update(repositoryUpdate)
      .eq('id', input.existingRepositoryId)
      .eq('workspace_id', workspace.id)
    : supabase
      .from('repositories')
      .upsert(repositoryFields, { onConflict: 'workspace_id,github_repository_id' })

  const { error } = await query

  if (error) {
    throw new Error('RepoView could not save this repository record.')
  }
}

export async function updateRepositoryVisibilityRules(id: string, rules: VisibilityRules) {
  const access = await requireRepositoryAccess(id)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('repositories')
    .update({
      default_rules: {
        hidden: [...rules.hidden],
        allowOnly: [...rules.allowOnly],
      },
    })
    .eq('id', id)
    .eq('workspace_id', access.workspace.id)

  if (error) {
    throw new Error('RepoView could not update repository visibility rules.')
  }
}

export async function setRepositoryEnabled(id: string, enabled: boolean) {
  const access = await requireRepositoryAccess(id)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  if (enabled && !access.repository.enabled) await assertWorkspaceResourceQuota('enabled-repositories', access.workspace.id)
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('repositories')
    .update({ enabled })
    .eq('id', id)
    .eq('workspace_id', access.workspace.id)

  if (error) {
    throw new Error('RepoView could not update this repository record.')
  }
}
