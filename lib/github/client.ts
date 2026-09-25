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

export type GitHubInstallationAccess = 'member' | 'system'

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
  options: { includeInactive?: boolean; access?: GitHubInstallationAccess } = {},
): Promise<Tables<'github_installations'>[]> {
  const supabase = await getWorkspaceSupabaseClient(workspaceId, options.access ?? 'member')
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
 * Load a verified local installation record. The provider installation id is
 * deliberately not accepted as an authorization input anywhere in the
 * normal application path.
 */
export async function getVerifiedGitHubInstallation(
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<Tables<'github_installations'>> {
  if (!isUuid(installationRecordId) || !isUuid(workspaceId)) {
    throw new GitHubInstallationConfigurationError('The local GitHub App installation reference is invalid.')
  }

  const supabase = await getWorkspaceSupabaseClient(workspaceId, access)
  const { data: installation, error: installationError } = await supabase
    .from('github_installations')
    .select('*')
    .eq('id', installationRecordId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .maybeSingle()

  if (installationError || !installation || installation.github_installation_id <= 0) {
    throw new GitHubInstallationConfigurationError()
  }

  return installation as Tables<'github_installations'>
}

/**
 * Mint a short-lived installation token from a verified local installation.
 */
export async function getGitHubInstallationAuthenticationForInstallation(
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
): Promise<InstallationAccessTokenAuthentication> {
  const installation = await getVerifiedGitHubInstallation(installationRecordId, workspaceId, access)
  return getGitHubInstallationAuthenticationByProviderId(installation.github_installation_id)
}

async function getGitHubInstallationAuthenticationByProviderId(installationId: number): Promise<InstallationAccessTokenAuthentication> {
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

/**
 * Raw provider lookup used only while verifying the installation returned by
 * the GitHub OAuth connection flow. Repository access uses a local record.
 */
export async function getGitHubAppInstallationByProviderId(installationId: number) {
  assertInstallationId(installationId)
  const { data } = await getGitHubAppClient().rest.apps.getInstallation({ installation_id: installationId })
  return data
}

/**
 * Returns an authenticated Octokit client for a verified local installation.
 */
export async function getGitHubInstallationClientForInstallation(
  installationRecordId: string,
  workspaceId: string,
  access: GitHubInstallationAccess = 'system',
) {
  const installation = await getVerifiedGitHubInstallation(installationRecordId, workspaceId, access)
  return getGitHubInstallationClientByProviderId(installation.github_installation_id)
}

function getGitHubInstallationClientByProviderId(installationId: number) {
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
  access: GitHubInstallationAccess = 'system',
) {
  const supabase = await getWorkspaceSupabaseClient(workspaceId, access)
  const { data: repository, error } = await supabase
    .from('repositories')
    .select('workspace_id, github_installation_id')
    .eq('id', repositoryId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !repository?.github_installation_id) {
    throw new GitHubInstallationConfigurationError()
  }

  return getGitHubInstallationClientForInstallation(repository.github_installation_id, workspaceId, access)
}

async function getWorkspaceSupabaseClient(workspaceId: string, access: GitHubInstallationAccess) {
  if (access === 'member') {
    await requireWorkspaceMember(workspaceId)
    const { createSupabaseServerClient } = await import('../supabase/server')
    return createSupabaseServerClient()
  }

  const { createSupabaseAdminClient } = await import('../supabase/admin')
  return createSupabaseAdminClient()
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
