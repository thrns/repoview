import 'server-only'

import { requireRepositoryAccess, requireWorkspace, requireWorkspaceAdmin, requireWorkspaceRole } from '../auth/workspace'
import type { GitHubRepositorySummary } from '../github/types'
import { findRegisteredRepository } from './identity'
import { createSupabaseServerClient } from '../supabase/server'
import type { VisibilityRules } from '../security/visibility'
import type { Tables } from '../supabase/database.types'
import { finalizeResourceQuota, releaseResourceQuota, reserveResourceQuota, type ResourceQuotaReservation } from '../security/quotas'
import { AUDIT_ACTIONS, recordAuditLogBestEffort } from '../audit-log'

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
  const { workspace, user } = await requireWorkspaceAdmin()
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

  let existingEnabled: boolean | null = null
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
    existingEnabled = existing.data?.enabled ?? null
  } else if (input.existingRepositoryId) {
    const existing = await supabase
      .from('repositories')
      .select('enabled')
      .eq('id', input.existingRepositoryId)
      .eq('workspace_id', workspace.id)
      .maybeSingle()
    if (existing.error) throw new Error('RepoView could not inspect this repository record.')
    existingEnabled = existing.data?.enabled ?? null
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

  let resourceReservation: ResourceQuotaReservation | null = null
  let saved = false
  try {
    if (input.enabled && existingEnabled !== true) {
      resourceReservation = await reserveResourceQuota(
        'enabled-repositories',
        workspace.id,
        `repository:${input.existingRepositoryId ?? input.githubRepositoryId}`,
      )
    }

    const { data: savedRepository, error } = await query.select('id').maybeSingle()

    if (error || !savedRepository) {
      throw new Error('RepoView could not save this repository record.')
    }
    saved = true
    if (resourceReservation) {
      try {
        await finalizeResourceQuota(resourceReservation)
      } catch {
        // The enabled repository row is durable; the bounded reservation lease
        // prevents a finalization outage from making capacity permanently stale.
      }
    }

    if (!input.existingRepositoryId) {
      await recordAuditLogBestEffort({
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: AUDIT_ACTIONS.repositoryConnected,
        resourceType: 'repository',
        resourceId: savedRepository.id,
        metadata: { repository: `${input.githubOwner}/${input.githubRepo}`, github_repository_id: input.githubRepositoryId },
      })
    }

    if (existingEnabled !== input.enabled) {
      await recordAuditLogBestEffort({
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: input.enabled ? AUDIT_ACTIONS.repositoryEnabled : AUDIT_ACTIONS.repositoryDisabled,
        resourceType: 'repository',
        resourceId: savedRepository.id,
        metadata: { repository: `${input.githubOwner}/${input.githubRepo}` },
      })
    }
  } catch (error) {
    if (!saved && resourceReservation) {
      try {
        await releaseResourceQuota(resourceReservation)
      } catch {
        // The short reservation lease bounds recovery if the database is down.
      }
    }
    throw error
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

  await recordAuditLogBestEffort({
    workspaceId: access.workspace.id,
    actorUserId: access.user.id,
    action: AUDIT_ACTIONS.visibilityRulesChanged,
    resourceType: 'repository',
    resourceId: id,
    metadata: { hidden_count: rules.hidden.length, allow_only_count: rules.allowOnly.length },
  })
}

export async function setRepositoryEnabled(id: string, enabled: boolean) {
  const access = await requireRepositoryAccess(id)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  const supabase = await createSupabaseServerClient()
  let resourceReservation: ResourceQuotaReservation | null = null
  let saved = false
  try {
    if (enabled && !access.repository.enabled) {
      resourceReservation = await reserveResourceQuota('enabled-repositories', access.workspace.id, `repository:${id}`)
    }
    const { error } = await supabase
      .from('repositories')
      .update({ enabled })
      .eq('id', id)
      .eq('workspace_id', access.workspace.id)

    if (error) {
      throw new Error('RepoView could not update this repository record.')
    }
    saved = true
    if (resourceReservation) {
      try {
        await finalizeResourceQuota(resourceReservation)
      } catch {
        // The repository state is durable; the reservation expires safely.
      }
    }

    await recordAuditLogBestEffort({
      workspaceId: access.workspace.id,
      actorUserId: access.user.id,
      action: enabled ? AUDIT_ACTIONS.repositoryEnabled : AUDIT_ACTIONS.repositoryDisabled,
      resourceType: 'repository',
      resourceId: id,
      metadata: { repository: `${access.repository.github_owner}/${access.repository.github_repo}` },
    })
  } catch (error) {
    if (!saved && resourceReservation) {
      try {
        await releaseResourceQuota(resourceReservation)
      } catch {
        // The short reservation lease bounds recovery if the database is down.
      }
    }
    throw error
  }
}
