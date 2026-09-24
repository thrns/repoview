import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { getPublicEnv } from '../env/public'
import { getServerEnv } from '../env/server'
import { requireWorkspaceAdmin } from '../auth/workspace'
import { createSupabaseAdminClient } from '../supabase/admin'
import { getGitHubAppInstallation, GITHUB_API_BASE_URL, GITHUB_COMMON_HEADERS } from './client'
import { registerVerifiedGitHubInstallation } from './installations'
import { listInstallationRepositories } from './repositories'
import type { Tables } from '../supabase/database.types'

const CONNECTION_TTL_MS = 10 * 60 * 1000
const STATE_BYTES = 32

export type GitHubConnectionResult =
  | { status: 'success'; repositoryCount: number; returnPath: string }
  | { status: 'pending'; returnPath: string }

export class GitHubConnectionError extends Error {
  constructor(
    public readonly code: 'configuration' | 'invalid_state' | 'denied' | 'cancelled' | 'verification' | 'upstream',
    message = 'The GitHub connection could not be completed.',
  ) {
    super(message)
    this.name = 'GitHubConnectionError'
  }
}

export async function createGitHubInstallationUrl(returnPath = '/dashboard/settings') {
  const { workspace, user } = await requireWorkspaceAdmin()
  const env = getServerEnv()
  const state = randomBytes(STATE_BYTES).toString('base64url')
  const codeVerifier = randomBytes(STATE_BYTES).toString('base64url')
  const admin = createSupabaseAdminClient()

  await admin
    .from('github_connection_transactions')
    .delete()
    .lt('expires_at', new Date().toISOString())

  const { error } = await admin
    .from('github_connection_transactions')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      state_hash: hashState(state),
      code_verifier: codeVerifier,
      return_path: normalizeReturnPath(returnPath),
      expires_at: new Date(Date.now() + CONNECTION_TTL_MS).toISOString(),
    })

  if (error) {
    throw new GitHubConnectionError('configuration', 'RepoView could not start the GitHub connection.')
  }

  const installationUrl = new URL(`https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new`)
  installationUrl.searchParams.set('state', state)
  return installationUrl.toString()
}

export async function beginGitHubAuthorization(state: string, installationId: number) {
  const { workspace, user } = await requireWorkspaceAdmin()
  assertState(state)
  assertInstallationId(installationId)

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('claim_github_connection_installation', {
    target_state_hash: hashState(state),
    target_user_id: user.id,
    target_installation_id: installationId,
  })

  const transaction = data?.[0]
  if (error || !transaction || transaction.workspace_id !== workspace.id) {
    throw new GitHubConnectionError('invalid_state')
  }

  return buildAuthorizationUrl(state, transaction.code_verifier)
}

export async function markGitHubConnectionPending(state: string) {
  const { workspace, user } = await requireWorkspaceAdmin()
  assertState(state)
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('github_connection_transactions')
    .update({ status: 'pending_approval' })
    .eq('state_hash', hashState(state))
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .eq('status', 'pending_installation')
    .gt('expires_at', new Date().toISOString())
    .select('id, return_path')
    .maybeSingle()

  if (error || !data) throw new GitHubConnectionError('invalid_state')
  return data.return_path
}

export async function markGitHubConnectionFinished(state: string, status: 'cancelled' | 'failed') {
  const { workspace, user } = await requireWorkspaceAdmin()
  assertState(state)
  const admin = createSupabaseAdminClient()
  const { data: finished, error } = await admin
    .from('github_connection_transactions')
    .update({ status })
    .eq('state_hash', hashState(state))
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .in('status', ['pending_installation', 'awaiting_authorization'])
    .gt('expires_at', new Date().toISOString())
    .select('id, return_path')
    .maybeSingle()

  if (error || !finished) throw new GitHubConnectionError('invalid_state')
  return finished.return_path
}

export async function completeGitHubConnection(state: string, code: string): Promise<GitHubConnectionResult> {
  const { workspace, user } = await requireWorkspaceAdmin()
  assertState(state)
  if (!code || code.length > 512) throw new GitHubConnectionError('upstream')

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('consume_github_connection_transaction', {
    target_state_hash: hashState(state),
    target_user_id: user.id,
  })
  const transaction = data?.[0]

  if (error || !transaction || transaction.workspace_id !== workspace.id || !transaction.claimed_installation_id) {
    throw new GitHubConnectionError('invalid_state')
  }

  const accessToken = await exchangeCodeForUserToken(code, transaction.code_verifier)
  const githubUser = await fetchGitHubUser(accessToken)
  const visibleInstallation = await findVisibleInstallation(accessToken, transaction.claimed_installation_id)

  if (!visibleInstallation) {
    return { status: 'pending', returnPath: normalizeReturnPath(transaction.return_path) }
  }

  if (visibleInstallation.account.type === 'User' && visibleInstallation.account.id !== githubUser.id) {
    throw new GitHubConnectionError('verification')
  }

  const installation = await getGitHubAppInstallation(transaction.claimed_installation_id)
  const env = getServerEnv()
  const canonicalAccount: Record<string, unknown> | null = isRecord(installation.account) ? installation.account : null
  if (installation.id !== transaction.claimed_installation_id || installation.app_id !== env.GITHUB_APP_ID || !canonicalAccount) {
    throw new GitHubConnectionError('verification')
  }
  if (typeof canonicalAccount.id !== 'number' || typeof canonicalAccount.login !== 'string' || typeof canonicalAccount.type !== 'string') {
    throw new GitHubConnectionError('verification')
  }
  if (
    canonicalAccount.id !== visibleInstallation.account.id
    || canonicalAccount.login.toLowerCase() !== visibleInstallation.account.login.toLowerCase()
    || canonicalAccount.type !== visibleInstallation.account.type
  ) {
    throw new GitHubConnectionError('verification')
  }

  const savedInstallation = await registerVerifiedGitHubInstallation(workspace.id, installation)
  const repositories = await listInstallationRepositories(
    installation.id,
    savedInstallation.id,
  )

  return { status: 'success', repositoryCount: repositories.length, returnPath: normalizeReturnPath(transaction.return_path) }
}

function buildAuthorizationUrl(state: string, codeVerifier: string) {
  const env = getServerEnv()
  const publicEnv = getPublicEnv()
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID)
  url.searchParams.set('redirect_uri', getCallbackUrl(publicEnv.NEXT_PUBLIC_APP_URL))
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', createCodeChallenge(codeVerifier))
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('allow_signup', 'false')
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

async function exchangeCodeForUserToken(code: string, codeVerifier: string) {
  const env = getServerEnv()
  const publicEnv = getPublicEnv()
  const body = new URLSearchParams({
    client_id: env.GITHUB_APP_CLIENT_ID,
    client_secret: env.GITHUB_APP_CLIENT_SECRET,
    code,
    redirect_uri: getCallbackUrl(publicEnv.NEXT_PUBLIC_APP_URL),
    code_verifier: codeVerifier,
  })
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      ...GITHUB_COMMON_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  })

  const payload = await readJson(response)
  if (!response.ok || !isRecord(payload) || typeof payload.access_token !== 'string') {
    throw new GitHubConnectionError('upstream')
  }

  return payload.access_token
}

async function fetchGitHubUser(accessToken: string): Promise<{ id: number }> {
  const payload = await fetchGitHubApi('/user', accessToken)
  if (!isRecord(payload) || typeof payload.id !== 'number') {
    throw new GitHubConnectionError('verification')
  }
  return { id: payload.id }
}

async function findVisibleInstallation(accessToken: string, installationId: number): Promise<{ account: { id: number; login: string; type: string } } | null> {
  const payload = await fetchGitHubApi('/user/installations?per_page=100', accessToken)
  const env = getServerEnv()
  if (!isRecord(payload) || !Array.isArray(payload.installations)) {
    throw new GitHubConnectionError('verification')
  }

  const installation = payload.installations.find((candidate) => {
    if (!isRecord(candidate) || candidate.id !== installationId || candidate.app_id !== env.GITHUB_APP_ID) return false
    return isRecord(candidate.account)
      && typeof candidate.account.id === 'number'
      && typeof candidate.account.login === 'string'
      && typeof candidate.account.type === 'string'
  })

  if (!isRecord(installation) || !isRecord(installation.account)) return null

  return {
    account: {
      id: installation.account.id as number,
      login: installation.account.login as string,
      type: installation.account.type as string,
    },
  }
}

async function fetchGitHubApi(path: string, accessToken: string) {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    headers: {
      ...GITHUB_COMMON_HEADERS,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })
  const payload = await readJson(response)
  if (!response.ok) throw new GitHubConnectionError('upstream')
  return payload
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function hashState(state: string) {
  assertState(state)
  return createHash('sha256').update(state, 'utf8').digest('hex')
}

export function createCodeChallenge(codeVerifier: string) {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(codeVerifier)) {
    throw new GitHubConnectionError('configuration', 'The GitHub PKCE verifier is invalid.')
  }
  return createHash('sha256').update(codeVerifier, 'utf8').digest('base64url')
}

function getCallbackUrl(appUrl: string) {
  return new URL('/api/github/callback', `${appUrl.replace(/\/$/, '')}/`).toString()
}

export function normalizeReturnPath(value: string) {
  if (value === '/onboarding' || value === '/dashboard/settings') return value
  return '/dashboard/settings'
}

function assertState(state: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(state)) {
    throw new GitHubConnectionError('invalid_state')
  }
}

function assertInstallationId(installationId: number) {
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    throw new GitHubConnectionError('invalid_state')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export type GitHubConnectionTransaction = Tables<'github_connection_transactions'>
