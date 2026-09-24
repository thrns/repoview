import 'server-only'

import { z } from 'zod'

import { requireWorkspaceAdmin } from '../auth/workspace'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { Json, Tables } from '../supabase/database.types'

const GitHubAccountLoginMaxLength = 100

const verifiedInstallationSchema = z.object({
  id: z.number().int().positive(),
  app_id: z.number().int().positive(),
  account: z.object({
    id: z.number().int().positive(),
    login: z.string().trim().min(1).max(GitHubAccountLoginMaxLength),
    type: z.enum(['User', 'Organization', 'Bot']),
  }),
  repository_selection: z.enum(['all', 'selected']),
  permissions: z.record(z.string()).default({}),
  suspended_at: z.string().nullable().default(null),
})

export type VerifiedGitHubInstallation = z.infer<typeof verifiedInstallationSchema>

/**
 * Persist metadata returned by GitHub only after the connection flow has
 * verified both the OAuth user relationship and the App installation.
 */
export async function registerVerifiedGitHubInstallation(
  workspaceId: string,
  input: unknown,
): Promise<Tables<'github_installations'>> {
  const parsed = verifiedInstallationSchema.parse(input)
  const { workspace } = await requireWorkspaceAdmin()
  if (workspace.id !== workspaceId) {
    throw new Error('The GitHub App installation workspace is not authorized.')
  }

  const supabase = createSupabaseAdminClient()
  const providerFields = {
    github_installation_id: parsed.id,
    github_account_id: parsed.account.id,
    github_account_login: parsed.account.login,
    github_account_type: parsed.account.type,
    repository_selection: parsed.repository_selection,
    permissions: parsed.permissions as Json,
    status: parsed.suspended_at ? 'suspended' as const : 'active' as const,
    suspended_at: parsed.suspended_at,
  }

  const { data: existing, error: lookupError } = await supabase
    .from('github_installations')
    .select('id, workspace_id')
    .eq('github_installation_id', parsed.id)
    .maybeSingle()

  if (lookupError) {
    throw new Error('RepoView could not inspect the GitHub App installation.')
  }

  if (existing && existing.workspace_id !== workspace.id) {
    throw new Error('This GitHub App installation is already connected to another workspace.')
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
