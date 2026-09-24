import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getDefaultVisibilityRules,
  getSafeVisibilityRules,
  isPathAllowed,
  parseVisibilityRules,
} from '../lib/security/visibility'
import { normalizeRepositoryPath } from '../lib/security/path'

const defaultsMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260921213000_repository_visibility_defaults.sql'),
  'utf8',
)

describe('repository visibility rules', () => {
  it('seeds the documented defaults and stores normalized patterns', () => {
    const defaults = getDefaultVisibilityRules()
    expect(defaults.hidden).toContain('**/secrets/**')
    expect(defaults.allowOnly).toEqual([])
    expect(parseVisibilityRules({ hidden: [' /src/** ', '/src/**'], allowOnly: ['docs/**'] })).toEqual({
      hidden: ['src/**'],
      allowOnly: ['docs/**'],
    })
    expect(defaultsMigration).toContain('alter column default_rules set default')
    expect(defaultsMigration).toContain('"allowOnly":[]')
  })

  it('validates patterns and fails closed for invalid stored rules', () => {
    expect(() => parseVisibilityRules({ hidden: ['['] })).toThrow(/Invalid visibility pattern/)
    expect(getSafeVisibilityRules({ hidden: ['%2E%2E/secrets/**'] }).hidden).toEqual(['**/*'])
    expect(isPathAllowed('src/index.ts', { hidden: ['**/*.env'] })).toBe(true)
    expect(isPathAllowed('src/.env', { hidden: ['**/.env'] })).toBe(false)
  })

  it('rejects traversal and NUL paths before matching', () => {
    expect(normalizeRepositoryPath('/src/./index.ts')).toBe('src/index.ts')
    expect(normalizeRepositoryPath('/src/%2E%2E/secrets.txt')).toBeNull()
    expect(normalizeRepositoryPath('/src/%252E%252E/secrets.txt')).toBeNull()
    expect(normalizeRepositoryPath('src/secret\0.txt')).toBeNull()
    expect(normalizeRepositoryPath('src/%')).toBeNull()
    expect(normalizeRepositoryPath('a/'.repeat(257))).toBeNull()
    expect(normalizeRepositoryPath(null)).toBeNull()
    expect(normalizeRepositoryPath('')).toBeNull()
    expect(isPathAllowed('../secrets.txt', {})).toBe(false)
  })
})
