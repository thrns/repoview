import 'server-only'

import {
  createAppAuth,
  type InstallationAccessTokenAuthentication,
  type StrategyOptions,
} from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

import { getServerEnv } from '../env/server'

export const GITHUB_API_BASE_URL = 'https://api.github.com'
export const GITHUB_API_VERSION = '2022-11-28'

export const GITHUB_COMMON_HEADERS = Object.freeze({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': GITHUB_API_VERSION,
})

const installationAuthenticators = new Map<number, ReturnType<typeof createAppAuth>>()
const installationClients = new Map<number, Octokit>()

function getGitHubAppAuthOptions(installationId: number): StrategyOptions {
  const env = getServerEnv()

  return {
    appId: env.GITHUB_APP_ID,
    installationId,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  }
}

export class GitHubInstallationConfigurationError extends Error {
  constructor() {
    super('No GitHub App installation is configured for this workspace.')
    this.name = 'GitHubInstallationConfigurationError'
  }
}

export async function getWorkspaceGitHubInstallationId(workspaceId: string) {
  const { createSupabaseAdminClient } = await import('../supabase/admin')
  const { data, error } = await createSupabaseAdminClient()
    .from('github_installations')
    .select('installation_id, uses_environment_credentials')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .maybeSingle()

  if (error) {
    throw new GitHubInstallationConfigurationError()
  }

  if (data?.installation_id) {
    return data.installation_id
  }

  if (data?.uses_environment_credentials) {
    return getServerEnv().GITHUB_APP_INSTALLATION_ID
  }

  throw new GitHubInstallationConfigurationError()
}

/**
 * Mints a short-lived installation token on the server. Octokit's auth-app
 * package caches and refreshes the token according to GitHub's expiry.
 */
export async function getGitHubInstallationAuthentication(installationId = getServerEnv().GITHUB_APP_INSTALLATION_ID): Promise<InstallationAccessTokenAuthentication> {
  let authenticator = installationAuthenticators.get(installationId)
  if (!authenticator) {
    authenticator = createAppAuth(getGitHubAppAuthOptions(installationId))
    installationAuthenticators.set(installationId, authenticator)
  }
  return authenticator({ type: 'installation' })
}

/**
 * Returns an authenticated Octokit client. This module is server-only so the
 * App private key and installation token cannot enter browser bundles.
 */
export function getGitHubInstallationClient(installationId = getServerEnv().GITHUB_APP_INSTALLATION_ID) {
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

export async function getGitHubInstallationClientForWorkspace(workspaceId: string) {
  return getGitHubInstallationClient(await getWorkspaceGitHubInstallationId(workspaceId))
}
