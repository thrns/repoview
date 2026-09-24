import 'server-only'

import { requireRepositoryAccess, requireWorkspace, requireWorkspaceAdmin, requireWorkspaceRole } from '../auth/workspace'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { VisibilityRules } from '../security/visibility'
import type { Tables } from '../supabase/database.types'

export type RepositoryRecord = Tables<'repositories'>

export async function listRegisteredRepositories(): Promise<RepositoryRecord[]> {
  const { workspace } = await requireWorkspace()
  const { data, error } = await createSupabaseAdminClient()
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

export async function saveRepositoryRecord(input: {
  githubOwner: string
  githubRepo: string
  defaultBranch: string
  enabled: boolean
  defaultRules?: VisibilityRules
}) {
  const { workspace } = await requireWorkspaceAdmin()
  const { error } = await createSupabaseAdminClient()
    .from('repositories')
    .upsert({
      workspace_id: workspace.id,
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
    }, { onConflict: 'workspace_id,github_owner,github_repo' })

  if (error) {
    throw new Error('RepoView could not save this repository record.')
  }
}

export async function updateRepositoryVisibilityRules(id: string, rules: VisibilityRules) {
  const access = await requireRepositoryAccess(id)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  const { error } = await createSupabaseAdminClient()
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
  const { error } = await createSupabaseAdminClient()
    .from('repositories')
    .update({ enabled })
    .eq('id', id)
    .eq('workspace_id', access.workspace.id)

  if (error) {
    throw new Error('RepoView could not update this repository record.')
  }
}
