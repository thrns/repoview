import picomatch from 'picomatch'
import { z } from 'zod'

import { normalizeRepositoryPath } from './path'

export { normalizeRepositoryPath } from './path'

export interface VisibilityRules {
  hidden: string[]
  allowOnly: string[]
}

export const DEFAULT_VISIBILITY_RULES: VisibilityRules = {
  hidden: [
    '.env*',
    '**/.env*',
    '**/secrets/**',
    '**/credentials/**',
    '**/*.pem',
    '**/*.key',
    '.git/**',
    'node_modules/**',
  ],
  allowOnly: [],
}

const visibilityRulesInputSchema = z.object({
  hidden: z.array(z.string()).max(100).default([]),
  allowOnly: z.array(z.string()).max(100).default([]),
}).strict()

export class VisibilityRuleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VisibilityRuleValidationError'
  }
}

export function getDefaultVisibilityRules(): VisibilityRules {
  return {
    hidden: [...DEFAULT_VISIBILITY_RULES.hidden],
    allowOnly: [...DEFAULT_VISIBILITY_RULES.allowOnly],
  }
}

export function parseVisibilityRules(input: unknown): VisibilityRules {
  const result = visibilityRulesInputSchema.safeParse(input ?? {})
  if (!result.success) {
    throw new VisibilityRuleValidationError('Visibility rules must contain at most 100 hidden and 100 allow-only patterns.')
  }

  return {
    hidden: uniqueNormalizedPatterns(result.data.hidden),
    allowOnly: uniqueNormalizedPatterns(result.data.allowOnly),
  }
}

export function getSafeVisibilityRules(input: unknown): VisibilityRules {
  try {
    return parseVisibilityRules(input)
  } catch {
    // Invalid stored policy must fail closed instead of breaking viewer rendering.
    return { hidden: ['**/*'], allowOnly: [] }
  }
}

export function isPathAllowed(path: string, input: unknown) {
  const normalizedPath = normalizeRepositoryPath(path)
  if (!normalizedPath) {
    return false
  }

  const rules = getSafeVisibilityRules(input)
  const hidden = rules.hidden.some((pattern) => picomatch(pattern, { dot: true })(normalizedPath))
  if (hidden) {
    return false
  }

  return rules.allowOnly.length === 0 || rules.allowOnly.some((pattern) => picomatch(pattern, { dot: true })(normalizedPath))
}

/**
 * Applies repository defaults and share-specific narrowing before any path is
 * returned. A share can add hidden patterns or narrow an allow-only policy,
 * but cannot widen a repository policy.
 */
export function isPathAllowedForShare(path: string, repositoryInput: unknown, shareInput: unknown) {
  const normalizedPath = normalizeRepositoryPath(path)
  if (!normalizedPath) {
    return false
  }

  const repositoryRules = getSafeVisibilityRules(repositoryInput)
  const shareRules = getSafeVisibilityRules(shareInput)
  const hiddenPatterns = [...repositoryRules.hidden, ...shareRules.hidden]

  if (hiddenPatterns.some((pattern) => picomatch(pattern, { dot: true })(normalizedPath))) {
    return false
  }

  if (repositoryRules.allowOnly.length > 0 && !matchesAny(normalizedPath, repositoryRules.allowOnly)) {
    return false
  }

  return shareRules.allowOnly.length === 0 || matchesAny(normalizedPath, shareRules.allowOnly)
}

export function filterVisibleTree<T extends { path: string; type: string }>(
  entries: T[],
  repositoryInput: unknown,
  shareInput: unknown,
) {
  const visibleEntries = entries.filter((entry) =>
    isPathAllowedForShare(entry.path, repositoryInput, shareInput),
  )
  const requiredParents = new Set<string>()

  for (const entry of visibleEntries) {
    const segments = entry.path.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      requiredParents.add(segments.slice(0, index).join('/'))
    }
  }

  return entries.filter((entry) => {
    const normalizedPath = normalizeRepositoryPath(entry.path)
    return normalizedPath !== null && (
      visibleEntries.includes(entry) || requiredParents.has(normalizedPath)
    )
  })
}

function uniqueNormalizedPatterns(patterns: string[]) {
  return [...new Set(patterns.map(normalizeGlobPattern))]
}

function matchesAny(path: string, patterns: string[]) {
  return patterns.some((pattern) => picomatch(pattern, { dot: true })(path))
}

function normalizeGlobPattern(pattern: string) {
  const normalized = pattern.trim().replaceAll('\\', '/')
  if (!normalized || normalized.length > 256 || normalized.includes('\0')) {
    throw new VisibilityRuleValidationError('Visibility patterns must be non-empty, <= 256 characters, and cannot contain NUL bytes.')
  }

  let decodedPattern: string
  try {
    decodedPattern = decodeURIComponent(normalized)
  } catch {
    throw new VisibilityRuleValidationError('Visibility patterns must use valid URL encoding.')
  }

  if (decodedPattern.split('/').some((segment) => segment === '..')) {
    throw new VisibilityRuleValidationError('Visibility patterns cannot contain unresolved parent-directory segments.')
  }

  try {
    if (!hasBalancedGlobDelimiters(normalized)) {
      throw new VisibilityRuleValidationError(`Invalid visibility pattern: ${pattern}`)
    }
    picomatch(normalized, { dot: true })
  } catch {
    throw new VisibilityRuleValidationError(`Invalid visibility pattern: ${pattern}`)
  }

  return normalized.replace(/^\/+/, '')
}

function hasBalancedGlobDelimiters(pattern: string) {
  const stack: string[] = []
  const pairs: Record<string, string> = { ']': '[', ')': '(', '}': '{' }
  let escaped = false

  for (const character of pattern) {
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (character === '[' || character === '(' || character === '{') {
      stack.push(character)
      continue
    }
    if (character === ']' || character === ')' || character === '}') {
      if (stack.pop() !== pairs[character]) {
        return false
      }
    }
  }

  return !escaped && stack.length === 0
}
