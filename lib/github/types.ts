export interface GitHubRepositorySummary {
  id: number
  owner: string
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  description: string | null
  htmlUrl: string
  archived: boolean
  disabled: boolean
}

export interface GitHubRepositoryBranch {
  name: string
  sha: string
  protected: boolean
}

export interface GitHubRepositoryRef {
  name: string
  ref: string
  sha: string
  type: string
}

export type GitHubRepositoryErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'not_found'
  | 'unavailable'
  | 'upstream'

export class GitHubRepositoryError extends Error {
  constructor(
    public readonly code: GitHubRepositoryErrorCode,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(getErrorMessage(code))
    this.name = 'GitHubRepositoryError'
  }
}

function getErrorMessage(code: GitHubRepositoryErrorCode) {
  switch (code) {
    case 'unauthorized':
      return 'GitHub App authentication failed.'
    case 'forbidden':
      return 'The GitHub App installation cannot list repositories.'
    case 'rate_limited':
      return 'The GitHub API rate limit was reached.'
    case 'not_found':
      return 'The GitHub resource was not found.'
    case 'unavailable':
      return 'GitHub is temporarily unavailable.'
    case 'upstream':
      return 'GitHub repository listing failed.'
  }
}
