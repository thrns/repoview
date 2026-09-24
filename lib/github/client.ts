import 'server-only'

import {
  createAppAuth,
  type InstallationAccessTokenAuthentication,
  type StrategyOptions,
} from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

import { requireWorkspaceMember } from '../auth/workspace'
import { getServerEnv } from '../env/server'
import type { Tables } from '../supabase/database.types'

export const GITHUB_API_BASE_URL = 'https://api.github.com'
export const GITHUB_API_VERSION = '2022-11-28'

export const GITHUB_COMMON_HEADERS = Object.freeze({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': GITHUB_API_VERSION,
})

const installationAuthenticators = new Map<number, ReturnType<typeof createAppAuth>>()
const installationClients = new Map<number, Octokit>()
let appClient: Octokit | undefined

export class GitHubInstallationConfigurationError extends Error {
  constructor(message = 'The GitHub App installation is unavailable for this workspace.') {
    super(message)
    this.name = 'GitHubInstallationConfigurationError'
  }
}

function getGitHubAppAuthOptions(installationId?: number): StrategyOptions {
  if (installationId !== undefined) assertInstallationId(installationId)
  const env = getServerEnv()

  return {
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    ...(installationId === undefined ? {} : { installationId }),
  }
}

function assertInstallationId(installationId: number) {
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new GitHubInstallationConfigurationError('The GitHub App installation ID is invalid.')
  }
}

/**
 * Resolve active installations visible to an authenticated workspace member.
 * The workspace id is never treated as authorization on its own.
 */
export async function listWorkspaceGitHubInstallations(
  workspaceId: string,
  options: { includeInactive?: boolean } = {},
): Promise<Tables<'github_installations'>[]> {
  await requireWorkspaceMember(workspaceId)
  const { createSupabaseServerClient } = await import('../supabase/server')
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('github_installations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (!options.includeInactive) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query

  if (error) {
    throw new GitHubInstallationConfigurationError()
  }

  return (data ?? []).filter((installation) => installation.github_installation_id > 0)
}

/**
 * Resolve the provider installation attached to a repository. Both the
 * repository workspace and installation workspace are checked explicitly so
 * a caller cannot substitute an installation from another tenant.
 */
export async function getGitHubInstallationIdForRepository(
  repositoryId: string,
  workspaceId: string,
  access: 'member' | 'system' = 'system',
) {
  const supabase = access === 'member'
    ? await (async () => {
      await requireWorkspaceMember(workspaceId)
      const { createSupabaseServerClient } = await import('../supabase/server')
      return createSupabaseServerClient()
    })()
    : await (async () => {
      const { createSupabaseAdminClient } = await import('../supabase/admin')
      return createSupabaseAdminClient()
    })()

  const { data: repository, error: repositoryError } = await supabase
    .from('repositories')
    .select('workspace_id, github_installation_id')
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (repositoryError || !repository?.github_installation_id) {
    throw new GitHubInstallationConfigurationError()
  }

  const { data: installation, error: installationError } = await supabase
    .from('github_installations')
    .select('github_installation_id, status')
    .eq('id', repository.github_installation_id)
    .eq('workspace_id', repository.workspace_id)
    .eq('status', 'active')
    .maybeSingle()

  if (installationError || !installation || installation.github_installation_id <= 0) {
    throw new GitHubInstallationConfigurationError()
  }

  return installation.github_installation_id
}

/**
 * Mint a short-lived installation token on the server. The installation ID
 * must come from a workspace/repository authorization lookup; it is never
 * read from a global environment variable.
 */
export async function getGitHubInstallationAuthentication(installationId: number): Promise<InstallationAccessTokenAuthentication> {
  let authenticator = installationAuthenticators.get(installationId)
  if (!authenticator) {
    authenticator = createAppAuth(getGitHubAppAuthOptions(installationId))
    installationAuthenticators.set(installationId, authenticator)
  }
  return authenticator({ type: 'installation' })
}

/**
 * Returns the App-authenticated client used only for installation metadata.
 * This client authenticates with a short-lived JWT and never enters a browser
 * bundle because this module is explicitly server-only.
 */
export function getGitHubAppClient() {
  if (appClient) return appClient

  appClient = new Octokit({
    authStrategy: createAppAuth,
    auth: getGitHubAppAuthOptions(),
    baseUrl: GITHUB_API_BASE_URL,
    headers: GITHUB_COMMON_HEADERS,
  })
  return appClient
}

export async function getGitHubAppInstallation(installationId: number) {
  assertInstallationId(installationId)
  const { data } = await getGitHubAppClient().rest.apps.getInstallation({ installation_id: installationId })
  return data
}

/**
 * Returns an authenticated Octokit client for one explicit installation.
 * This module is server-only so the App private key and installation token
 * cannot enter browser bundles.
 */
export function getGitHubInstallationClient(installationId: number) {
  assertInstallationId(installationId)
  let client = installationClients.get(installationId)
  if (client) return client

  client = new Octokit({
    authStrategy: createAppAuth,
    auth: getGitHubAppAuthOptions(installationId),
    baseUrl: GITHUB_API_BASE_URL,
    headers: GITHUB_COMMON_HEADERS,
  })
  installationClients.set(installationId, client)
  return client
}

export async function getGitHubInstallationClientForRepository(
  repositoryId: string,
  workspaceId: string,
  access: 'member' | 'system' = 'system',
) {
  const installationId = await getGitHubInstallationIdForRepository(repositoryId, workspaceId, access)
  return getGitHubInstallationClient(installationId)
}
