'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireRepositoryAccess, requireWorkspaceAdmin, requireWorkspaceRole } from '@/lib/auth/workspace'
import { listWorkspaceInstallationRepositories } from '@/lib/github/repositories'
import { getDefaultVisibilityRules, parseVisibilityRules } from '@/lib/security/visibility'
import { findRegisteredRepository } from '@/lib/repositories/identity'
import { enforceAuthenticatedRateLimit, enforceRateLimits } from '../../../../lib/security/rate-limit'
import {
  listRegisteredRepositories,
  saveRepositoryRecord,
  setRepositoryEnabled as setStoredRepositoryEnabled,
  updateRepositoryVisibilityRules,
} from '@/lib/repositories/registry'

const repositoryInputSchema = z.object({
  repositoryId: z.string().uuid().optional(),
  installationRecordId: z.string().uuid(),
  githubRepositoryId: z.number().int().positive(),
  githubNodeId: z.string().min(1).max(200),
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
  enabled: z.boolean(),
})

const bulkRepositoryInputSchema = z.object({
  repositories: z.array(repositoryInputSchema).min(1).max(100),
})

export async function setRepositoryEnabled(input: unknown) {
  const context = await requireWorkspaceAdmin()
  await enforceAuthenticatedRateLimit('authenticated-repository-sync', context.workspace.id, context.user.id)
  const parsed = repositoryInputSchema.parse(input)
  await enforceRateLimits('authenticated-repository-sync', [{ value: `installation:${parsed.installationRecordId}` }])

  if (!parsed.enabled && parsed.repositoryId) {
    const access = await requireRepositoryAccess(parsed.repositoryId)
    await requireWorkspaceRole(context.workspace.id, ['owner', 'admin'])
    if (access.workspace.id !== context.workspace.id) {
      throw new Error('That repository is not available in the active workspace.')
    }
    await setStoredRepositoryEnabled(parsed.repositoryId, false)
    revalidatePath('/dashboard/repositories')
    return
  }

  const accessibleRepositories = await listWorkspaceInstallationRepositories(context.workspace.id)
  const repository = accessibleRepositories.find((candidate) =>
    candidate.installationRecordId === parsed.installationRecordId
      && candidate.githubRepositoryId === parsed.githubRepositoryId,
  )

  if (!repository) {
    throw new Error('That repository is not accessible to the configured GitHub App installation.')
  }

  const storedRepositories = await listRegisteredRepositories()
  const existing = findRegisteredRepository(storedRepositories, repository)

  await saveRepositoryRecord({
    githubInstallationId: parsed.installationRecordId,
    githubRepositoryId: repository.githubRepositoryId,
    githubNodeId: repository.githubNodeId,
    githubOwner: repository.owner,
    githubRepo: repository.name,
    defaultBranch: repository.defaultBranch,
    enabled: parsed.enabled,
    ...(existing ? { existingRepositoryId: existing.id } : { defaultRules: getDefaultVisibilityRules() }),
  })
  revalidatePath('/dashboard/repositories')
}

export async function setRepositoriesEnabled(input: unknown) {
  const context = await requireWorkspaceAdmin()
  await enforceAuthenticatedRateLimit('authenticated-repository-sync', context.workspace.id, context.user.id)
  const parsed = bulkRepositoryInputSchema.parse(input)
  await enforceRateLimits('authenticated-repository-sync', [...new Set(parsed.repositories.map((entry) => entry.installationRecordId))].map((installationId) => ({ value: `installation:${installationId}` })))
  const accessibleRepositories = await listWorkspaceInstallationRepositories(context.workspace.id)
  const storedRepositories = await listRegisteredRepositories()
  await Promise.all(parsed.repositories.map(async (entry) => {
    if (!entry.enabled && entry.repositoryId) {
      const access = await requireRepositoryAccess(entry.repositoryId)
      if (access.workspace.id !== context.workspace.id) {
        throw new Error('That repository is not available in the active workspace.')
      }
      await setStoredRepositoryEnabled(entry.repositoryId, false)
      return
    }

    const repository = accessibleRepositories.find((candidate) =>
      candidate.installationRecordId === entry.installationRecordId
        && candidate.githubRepositoryId === entry.githubRepositoryId,
    )
    if (!repository) {
      throw new Error(`The repository ${entry.owner}/${entry.repo} is not accessible to the configured GitHub App installation.`)
    }

    const existing = findRegisteredRepository(storedRepositories, repository)

    if (!entry.enabled && !existing) return

    await saveRepositoryRecord({
      githubInstallationId: entry.installationRecordId,
      githubRepositoryId: repository.githubRepositoryId,
      githubNodeId: repository.githubNodeId,
      githubOwner: repository.owner,
      githubRepo: repository.name,
      defaultBranch: repository.defaultBranch,
      enabled: entry.enabled,
      ...(existing ? { existingRepositoryId: existing.id } : { defaultRules: getDefaultVisibilityRules() }),
    })
  }))

  revalidatePath('/dashboard/repositories')
}

const visibilityRulesInputSchema = z.object({
  repositoryId: z.string().uuid(),
  hidden: z.array(z.unknown()),
  allowOnly: z.array(z.unknown()),
})

export async function updateRepositoryRules(input: unknown) {
  const parsed = visibilityRulesInputSchema.parse(input)
  const access = await requireRepositoryAccess(parsed.repositoryId)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  const rules = parseVisibilityRules({ hidden: parsed.hidden, allowOnly: parsed.allowOnly })
  await updateRepositoryVisibilityRules(parsed.repositoryId, rules)
  revalidatePath('/dashboard/repositories')
}

const bulkVisibilityRulesInputSchema = z.object({
  repositoryIds: z.array(z.string().uuid()).min(1).max(100),
  hidden: z.array(z.unknown()),
  allowOnly: z.array(z.unknown()),
})

export async function updateRepositoriesRules(input: unknown) {
  const parsed = bulkVisibilityRulesInputSchema.parse(input)
  const rules = parseVisibilityRules({ hidden: parsed.hidden, allowOnly: parsed.allowOnly })
  const access = await Promise.all(parsed.repositoryIds.map((repositoryId) => requireRepositoryAccess(repositoryId)))
  const workspaceIds = new Set(access.map((repository) => repository.workspace.id))
  if (workspaceIds.size !== 1) {
    throw new Error('Repositories must belong to the same workspace.')
  }
  await requireWorkspaceRole(access[0].workspace.id, ['owner', 'admin'])
  await Promise.all(parsed.repositoryIds.map((repositoryId) => updateRepositoryVisibilityRules(repositoryId, rules)))
  revalidatePath('/dashboard/repositories')
}
