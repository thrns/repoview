import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { VisibilityRules } from '@/lib/security/visibility'
import type { Tables } from '@/lib/supabase/database.types'

export type RepositoryRecord = Tables<'repositories'>

export async function listRegisteredRepositories(): Promise<RepositoryRecord[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from('repositories')
    .select('*')
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
  const { error } = await createSupabaseAdminClient()
    .from('repositories')
    .upsert({
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
    }, { onConflict: 'github_owner,github_repo' })

  if (error) {
    throw new Error('RepoView could not save this repository record.')
  }
}

export async function updateRepositoryVisibilityRules(id: string, rules: VisibilityRules) {
  const { error } = await createSupabaseAdminClient()
    .from('repositories')
    .update({
      default_rules: {
        hidden: [...rules.hidden],
        allowOnly: [...rules.allowOnly],
      },
    })
    .eq('id', id)

  if (error) {
    throw new Error('RepoView could not update repository visibility rules.')
  }
}

export async function setRepositoryEnabled(id: string, enabled: boolean) {
  const { error } = await createSupabaseAdminClient()
    .from('repositories')
    .update({ enabled })
    .eq('id', id)

  if (error) {
    throw new Error('RepoView could not update this repository record.')
  }
}
