'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireRepositoryAccess, requireWorkspaceAdmin, requireWorkspaceRole } from '@/lib/auth/workspace'
import { listInstallationRepositories } from '@/lib/github/repositories'
import { getDefaultVisibilityRules, parseVisibilityRules } from '@/lib/security/visibility'
import {
  listRegisteredRepositories,
  saveRepositoryRecord,
  setRepositoryEnabled as setStoredRepositoryEnabled,
  updateRepositoryVisibilityRules,
} from '@/lib/repositories/registry'

const repositoryInputSchema = z.object({
  repositoryId: z.string().uuid().optional(),
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
  enabled: z.boolean(),
})

const bulkRepositoryInputSchema = z.object({
  repositories: z.array(repositoryInputSchema).min(1).max(100),
})

export async function setRepositoryEnabled(input: unknown) {
  const context = await requireWorkspaceAdmin()
  const parsed = repositoryInputSchema.parse(input)

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

  const accessibleRepositories = await listInstallationRepositories(context.workspace.id)
  const repository = accessibleRepositories.find((candidate) =>
    candidate.owner === parsed.owner && candidate.name === parsed.repo,
  )

  if (!repository) {
    throw new Error('That repository is not accessible to the configured GitHub App installation.')
  }

  const storedRepositories = await listRegisteredRepositories()
  const existing = storedRepositories.find((candidate) =>
    candidate.github_owner === repository.owner && candidate.github_repo === repository.name,
  )

  if (existing) {
    await setStoredRepositoryEnabled(existing.id, parsed.enabled)
  } else {
    await saveRepositoryRecord({
      githubOwner: repository.owner,
      githubRepo: repository.name,
      defaultBranch: repository.defaultBranch,
      enabled: parsed.enabled,
      defaultRules: getDefaultVisibilityRules(),
    })
  }
  revalidatePath('/dashboard/repositories')
}

export async function setRepositoriesEnabled(input: unknown) {
  const context = await requireWorkspaceAdmin()
  const parsed = bulkRepositoryInputSchema.parse(input)
  const accessibleRepositories = await listInstallationRepositories(context.workspace.id)
  const accessibleByFullName = new Map(
    accessibleRepositories.map((repository) => [repository.fullName, repository]),
  )
  const storedRepositories = await listRegisteredRepositories()
  const storedByFullName = new Map(
    storedRepositories.map((repository) => [`${repository.github_owner}/${repository.github_repo}`, repository]),
  )

  await Promise.all(parsed.repositories.map(async (entry) => {
    if (!entry.enabled && entry.repositoryId) {
      const access = await requireRepositoryAccess(entry.repositoryId)
      if (access.workspace.id !== context.workspace.id) {
        throw new Error('That repository is not available in the active workspace.')
      }
      await setStoredRepositoryEnabled(entry.repositoryId, false)
      return
    }

    const repository = accessibleByFullName.get(`${entry.owner}/${entry.repo}`)
    if (!repository) {
      throw new Error(`The repository ${entry.owner}/${entry.repo} is not accessible to the configured GitHub App installation.`)
    }

    const existing = storedByFullName.get(repository.fullName)
    if (existing) {
      await setStoredRepositoryEnabled(existing.id, entry.enabled)
      return
    }

    if (entry.enabled) {
      await saveRepositoryRecord({
        githubOwner: repository.owner,
        githubRepo: repository.name,
        defaultBranch: repository.defaultBranch,
        enabled: true,
        defaultRules: getDefaultVisibilityRules(),
      })
    }
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
