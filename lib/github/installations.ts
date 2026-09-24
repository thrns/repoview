import 'server-only'

import { z } from 'zod'

import { requireWorkspaceAdmin } from '../auth/workspace'
import { createSupabaseServerClient } from '../supabase/server'
import type { Json, Tables } from '../supabase/database.types'

const GitHubAccountLoginMaxLength = 100

const installationInputSchema = z.object({
  githubInstallationId: z.number().int().positive(),
  githubAccountId: z.number().int().positive(),
  githubAccountLogin: z.string().trim().min(1).max(GitHubAccountLoginMaxLength),
  githubAccountType: z.enum(['User', 'Organization', 'Bot']),
  repositorySelection: z.enum(['all', 'selected']),
  permissions: z.record(z.unknown()).default({}),
  status: z.enum(['active', 'suspended', 'deleted']).default('active'),
  suspendedAt: z.string().datetime({ offset: true }).nullable().default(null),
})

export async function registerGitHubInstallation(input: unknown): Promise<Tables<'github_installations'>> {
  const parsed = installationInputSchema.parse(input)
  const { workspace } = await requireWorkspaceAdmin()
  const supabase = await createSupabaseServerClient()
  const providerFields = {
    github_installation_id: parsed.githubInstallationId,
    github_account_id: parsed.githubAccountId,
    github_account_login: parsed.githubAccountLogin,
    github_account_type: parsed.githubAccountType,
    repository_selection: parsed.repositorySelection,
    permissions: parsed.permissions as Json,
    status: parsed.status,
    suspended_at: parsed.suspendedAt,
  }

  const { data: existing, error: lookupError } = await supabase
    .from('github_installations')
    .select('id, workspace_id')
    .eq('github_installation_id', parsed.githubInstallationId)
    .maybeSingle()

  if (lookupError) {
    throw new Error('RepoView could not inspect the GitHub App installation.')
  }

  const query = existing
    ? supabase.from('github_installations').update(providerFields).eq('id', existing.id).eq('workspace_id', workspace.id)
    : supabase.from('github_installations').insert({ workspace_id: workspace.id, ...providerFields })
  const { data, error } = await query.select('*').single()

  if (error || !data) {
    throw new Error('RepoView could not save the GitHub App installation.')
  }

  return data
}
