import 'server-only'

import { getGitHubInstallationClient, listWorkspaceGitHubInstallations } from './client'
import {
  GitHubRepositoryError,
  type GitHubRepositoryBranch,
  type GitHubRepositoryRef,
  type GitHubRepositorySummary,
} from './types'

type GitHubRepositoryLike = {
  id: number
  node_id: string
  owner: { login: string }
  name: string
  full_name: string
  private: boolean
  default_branch: string
  description: string | null
  html_url: string
  archived: boolean
  disabled: boolean
}

export async function listInstallationRepositories(installationId: number, installationRecordId: string): Promise<GitHubRepositorySummary[]> {
  const client = getGitHubInstallationClient(installationId)

  try {
    const repositories = await client.paginate(
      client.rest.apps.listReposAccessibleToInstallation,
      { per_page: 100 },
    )

    return repositories.map((repository) => ({
      ...mapGitHubRepository(repository, installationRecordId),
    }))
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }
}

export async function listWorkspaceInstallationRepositories(workspaceId: string): Promise<GitHubRepositorySummary[]> {
  const installations = await listWorkspaceGitHubInstallations(workspaceId)
  if (installations.length === 0) {
    throw new GitHubRepositoryError('upstream')
  }

  const repositories = await Promise.all(
    installations.map((installation) => listInstallationRepositories(
      installation.github_installation_id,
      installation.id,
    )),
  )

  const uniqueRepositories = new Map<number, GitHubRepositorySummary>()
  for (const repository of repositories.flat()) {
    if (!uniqueRepositories.has(repository.githubRepositoryId)) {
      uniqueRepositories.set(repository.githubRepositoryId, repository)
    }
  }

  return [...uniqueRepositories.values()]
}

export async function getRepositoryMetadata(owner: string, repo: string, installationId: number, installationRecordId: string): Promise<GitHubRepositorySummary> {
  const client = getGitHubInstallationClient(installationId)

  try {
    const { data } = await client.rest.repos.get({ owner, repo })
    return mapGitHubRepository(data, installationRecordId)
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }
}

export async function listRepositoryBranches(owner: string, repo: string, installationId: number): Promise<GitHubRepositoryBranch[]> {
  const client = getGitHubInstallationClient(installationId)

  try {
    const branches = await client.paginate(client.rest.repos.listBranches, {
      owner,
      repo,
      per_page: 100,
    })

    return branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }))
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }
}

export async function getRepositoryRef(owner: string, repo: string, ref: string, installationId: number): Promise<GitHubRepositoryRef> {
  const client = getGitHubInstallationClient(installationId)

  try {
    const response = await client.rest.git.getRef({ owner, repo, ref: normalizeGitHubRef(ref) })
    return {
      name: response.data.ref.replace(/^refs\//, ''),
      ref: response.data.ref,
      sha: response.data.object.sha,
      type: response.data.object.type,
    }
  } catch (error) {
    throw mapGitHubRepositoryError(error)
  }
}

function mapGitHubRepository(repository: GitHubRepositoryLike, installationRecordId: string): GitHubRepositorySummary {
  return {
    githubRepositoryId: repository.id,
    githubNodeId: repository.node_id,
    installationRecordId,
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    private: repository.private,
    defaultBranch: repository.default_branch,
    description: repository.description,
    htmlUrl: repository.html_url,
    archived: repository.archived,
    disabled: repository.disabled,
  }
}

export function mapGitHubRepositoryError(error: unknown) {
  const status = getStatus(error)
  const headers = getHeaders(error)
  const rateLimited = status === 429 || headers['x-ratelimit-remaining'] === '0'

  if (rateLimited) {
    return new GitHubRepositoryError('rate_limited', status, getRetryAfterSeconds(headers))
  }

  if (status === 401) {
    return new GitHubRepositoryError('unauthorized', status)
  }

  if (status === 403) {
    return new GitHubRepositoryError('forbidden', status)
  }

  if (status === 404) {
    return new GitHubRepositoryError('not_found', status)
  }

  if (status !== undefined && status >= 500) {
    return new GitHubRepositoryError('unavailable', status)
  }

  return new GitHubRepositoryError('upstream', status)
}

function normalizeGitHubRef(ref: string) {
  const trimmed = ref.trim().replace(/^refs\//, '')
  if (!trimmed) {
    throw new GitHubRepositoryError('upstream')
  }

  if (trimmed.startsWith('heads/') || trimmed.startsWith('tags/')) {
    return trimmed
  }

  return `heads/${trimmed}`
}

function getStatus(error: unknown) {
  if (!isRecord(error) || typeof error.status !== 'number') {
    return undefined
  }

  return error.status
}

function getHeaders(error: unknown): Record<string, string> {
  if (!isRecord(error) || !isRecord(error.response) || !isRecord(error.response.headers)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(error.response.headers).flatMap(([key, value]) => {
      if (typeof value === 'string') {
        return [[key.toLowerCase(), value]]
      }

      return []
    }),
  )
}

function getRetryAfterSeconds(headers: Record<string, string>) {
  const retryAfter = Number(headers['retry-after'])
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return retryAfter
  }

  const resetAt = Number(headers['x-ratelimit-reset'])
  if (Number.isFinite(resetAt)) {
    return Math.max(0, Math.ceil(resetAt - Date.now() / 1000))
  }

  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
