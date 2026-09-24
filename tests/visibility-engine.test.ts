import { describe, expect, it } from 'vitest'

import {
  filterVisibleTree,
  isPathAllowedForShare,
} from '../lib/security/visibility'

describe('visibility policy engine', () => {
  it('unions hidden rules and narrows repository allow-only rules', () => {
    const repositoryRules = { hidden: ['**/secrets/**'], allowOnly: ['src/**', 'docs/**'] }
    const shareRules = { hidden: ['docs/internal/**'], allowOnly: ['src/**'] }

    expect(isPathAllowedForShare('src/index.ts', repositoryRules, shareRules)).toBe(true)
    expect(isPathAllowedForShare('docs/README.md', repositoryRules, shareRules)).toBe(false)
    expect(isPathAllowedForShare('src/secrets/key.txt', repositoryRules, shareRules)).toBe(false)
    expect(isPathAllowedForShare('tests/index.ts', repositoryRules, shareRules)).toBe(false)
  })

  it('filters hidden tree entries while retaining visible parent directories', () => {
    const tree = [
      { path: 'src', type: 'tree' },
      { path: 'src/index.ts', type: 'blob' },
      { path: 'src/secrets', type: 'tree' },
      { path: 'src/secrets/key.pem', type: 'blob' },
      { path: 'docs', type: 'tree' },
      { path: 'docs/README.md', type: 'blob' },
    ]

    expect(filterVisibleTree(tree, { hidden: ['**/secrets/**'], allowOnly: ['src/**'] }, {})).toEqual([
      { path: 'src', type: 'tree' },
      { path: 'src/index.ts', type: 'blob' },
    ])
  })

  it('fails closed for malformed or traversal paths at every policy boundary', () => {
    expect(isPathAllowedForShare('%252e%252e/.env', {}, {})).toBe(false)
    expect(isPathAllowedForShare('src/.env', {}, { hidden: ['**/.env'] })).toBe(false)
  })
})
