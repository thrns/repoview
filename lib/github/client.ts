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

let installationAuthenticator: ReturnType<typeof createAppAuth> | null = null
let installationClient: Octokit | null = null

function getGitHubAppAuthOptions(): StrategyOptions {
  const env = getServerEnv()

  return {
    appId: env.GITHUB_APP_ID,
    installationId: env.GITHUB_APP_INSTALLATION_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
  }
}

/**
 * Mints a short-lived installation token on the server. Octokit's auth-app
 * package caches and refreshes the token according to GitHub's expiry.
 */
export async function getGitHubInstallationAuthentication(): Promise<InstallationAccessTokenAuthentication> {
  installationAuthenticator ??= createAppAuth(getGitHubAppAuthOptions())
  return installationAuthenticator({ type: 'installation' })
}

/**
 * Returns an authenticated Octokit client. This module is server-only so the
 * App private key and installation token cannot enter browser bundles.
 */
export function getGitHubInstallationClient() {
  installationClient ??= new Octokit({
    authStrategy: createAppAuth,
    auth: getGitHubAppAuthOptions(),
    baseUrl: GITHUB_API_BASE_URL,
    headers: GITHUB_COMMON_HEADERS,
  })
  return installationClient
}
