export const SHARE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export const SHARE_CODE_LENGTH = 9
export const LEGACY_SHARE_CODE_LENGTH = 8

export const SHARE_CODE_PATTERN = /^[A-Za-z0-9]{9}$/
export const LEGACY_SHARE_CODE_PATTERN = /^[A-Za-z0-9_-]{8}$/
export const SHARE_IDENTIFIER_PATTERN = /^(?:[A-Za-z0-9]{9}|[A-Za-z0-9_-]{8})$/
export const SHARE_CODE_MAX_ATTEMPTS = 5

export function isNewShareCode(value: string) {
  return SHARE_CODE_PATTERN.test(value)
}

export function isLegacyShareCode(value: string) {
  return LEGACY_SHARE_CODE_PATTERN.test(value)
}

export function isShareCode(value: string) {
  return isNewShareCode(value) || isLegacyShareCode(value)
}

/**
 * PostgREST exposes PostgreSQL unique violations as 23505 errors. Only retry
 * errors that identify the public share-code key; other database failures must
 * remain visible to the caller.
 */
export function isShareCodeUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const candidate = error as {
    code?: unknown
    constraint?: unknown
    details?: unknown
    message?: unknown
  }
  if (candidate.code !== '23505') return false

  const constraint = typeof candidate.constraint === 'string' ? candidate.constraint : ''
  const details = typeof candidate.details === 'string' ? candidate.details : ''
  const message = typeof candidate.message === 'string' ? candidate.message : ''
  const databaseErrorText = `${constraint} ${details} ${message}`
  return constraint === 'shares_share_code_idx'
    || /shares_share_code_idx/i.test(databaseErrorText)
    || /key\s*\(\s*share_code\s*\)/i.test(databaseErrorText)
}
