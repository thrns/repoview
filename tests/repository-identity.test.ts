import { describe, expect, it } from 'vitest'

import { findRegisteredRepository } from '../lib/repositories/identity'

const githubRepository = {
  githubRepositoryId: 42,
  installationRecordId: 'installation-new',
  owner: 'new-owner',
  name: 'renamed-repository',
}

describe('repository identity matching', () => {
  it('matches a renamed or transferred repository by GitHub repository id', () => {
    const existing = {
      github_repository_id: 42,
      github_installation_id: 'installation-old',
      github_owner: 'old-owner',
      github_repo: 'old-name',
    }

    expect(findRegisteredRepository([existing], githubRepository)).toBe(existing)
  })

  it('uses the old location only for a row awaiting identity migration', () => {
    const existing = {
      github_repository_id: null,
      github_installation_id: 'installation-new',
      github_owner: 'new-owner',
      github_repo: 'renamed-repository',
    }

    expect(findRegisteredRepository([existing], githubRepository)).toBe(existing)
  })

  it('does not match a different stable repository id at the same location', () => {
    const existing = {
      github_repository_id: 99,
      github_installation_id: 'installation-new',
      github_owner: 'new-owner',
      github_repo: 'renamed-repository',
    }

    expect(findRegisteredRepository([existing], githubRepository)).toBeNull()
  })
})
