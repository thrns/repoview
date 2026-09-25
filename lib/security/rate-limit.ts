import 'server-only'

import { createHash } from 'node:crypto'

import { headers } from 'next/headers'

import { getRateLimitEnv } from '../env/server'
import { getLinkOpenMetadata } from '../shares/link-open-metadata'
import { hashShareToken } from './tokens'
import { createSupabaseAdminClient } from '../supabase/admin'

export type RateLimitScope =
  | 'public-share-open'
  | 'public-viewer-confirm'
  | 'public-analytics-events'
  | 'public-viewer-heartbeat'
  | 'public-viewer-privacy'
  | 'public-asset'
  | 'public-download'
  | 'authenticated-share-create'
  | 'authenticated-share-rotate'
  | 'authenticated-repository-sync'
  | 'authenticated-github-connect'
  | 'authenticated-test-email'
  | 'authenticated-dashboard-analytics'
  | 'authenticated-account-reauth'
  | 'authenticated-account-export'
  | 'auth-signup'
  | 'auth-login'
  | 'auth-password-reset'

export type RateLimitPolicy = {
  limit: number
  windowSeconds: number
}

/**
 * These application limits complement (rather than replace) Vercel or another
 * edge firewall. They protect actual product work and use authenticated or
 * session context when it is available.
 */
export const RATE_LIMIT_POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  'public-share-open': { limit: 60, windowSeconds: 60 },
  'public-viewer-confirm': { limit: 20, windowSeconds: 60 },
  'public-analytics-events': { limit: 120, windowSeconds: 60 },
  'public-viewer-heartbeat': { limit: 120, windowSeconds: 60 },
  'public-viewer-privacy': { limit: 12, windowSeconds: 60 },
  'public-asset': { limit: 120, windowSeconds: 60 },
  'public-download': { limit: 20, windowSeconds: 60 },
  'authenticated-share-create': { limit: 20, windowSeconds: 300 },
  'authenticated-share-rotate': { limit: 10, windowSeconds: 300 },
  'authenticated-repository-sync': { limit: 12, windowSeconds: 300 },
  'authenticated-github-connect': { limit: 10, windowSeconds: 300 },
  'authenticated-test-email': { limit: 3, windowSeconds: 3600 },
  'authenticated-dashboard-analytics': { limit: 60, windowSeconds: 60 },
  'authenticated-account-reauth': { limit: 5, windowSeconds: 900 },
  'authenticated-account-export': { limit: 3, windowSeconds: 3600 },
  'auth-signup': { limit: 5, windowSeconds: 3600 },
  'auth-login': { limit: 10, windowSeconds: 600 },
  'auth-password-reset': { limit: 5, windowSeconds: 3600 },
}

export type RateLimitKey = {
  value: string
  policy?: RateLimitPolicy
}

export type RateLimitDecision = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: string
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super('Rate limiting is temporarily unavailable.')
    this.name = 'RateLimitUnavailableError'
  }
}

export class RateLimitExceededError extends Error {
  readonly decision: RateLimitDecision

  constructor(decision: RateLimitDecision) {
    super('Too many requests. Please try again later.')
    this.name = 'RateLimitExceededError'
    this.decision = decision
  }
}

/** Check every supplied context bucket and deny if any bucket is full. */
export async function checkRateLimits(scope: RateLimitScope, keys: RateLimitKey[]): Promise<RateLimitDecision | null> {
  const policy = RATE_LIMIT_POLICIES[scope]
  const normalizedKeys = [...new Map(keys.map((entry) => [entry.value, entry])).values()]
    .filter((entry) => entry.value.trim().length > 0)

  if (normalizedKeys.length === 0) throw new RateLimitUnavailableError()

  const admin = createSupabaseAdminClient()
  const decisions = await Promise.all(normalizedKeys.map(async (entry) => {
    const entryPolicy = entry.policy ?? policy
    const { data, error } = await admin.rpc('consume_rate_limit', {
      target_key_hash: hashRateLimitKey(`${scope}:${entry.value}`),
      target_scope: scope,
      target_limit: entryPolicy.limit,
      target_window_seconds: entryPolicy.windowSeconds,
    })

    if (error || !data?.[0]) throw new RateLimitUnavailableError()
    const row = data[0] as { allowed: boolean; remaining: number; retry_after_seconds: number; reset_at: string }
    return {
      allowed: row.allowed === true,
      limit: entryPolicy.limit,
      remaining: Math.max(0, Number(row.remaining ?? 0)),
      retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds ?? 1)),
      resetAt: row.reset_at,
    } satisfies RateLimitDecision
  }))

  return decisions.find((decision) => !decision.allowed) ?? null
}

export async function enforceRateLimits(scope: RateLimitScope, keys: RateLimitKey[]) {
  const decision = await checkRateLimits(scope, keys)
  if (decision) throw new RateLimitExceededError(decision)
}

/** Apply an IP bucket before an expensive public operation. */
export async function checkPublicRateLimit(request: Request, scope: RateLimitScope, additionalKeys: string[] = []) {
  const clientIp = getRequestIp(request)
  const keys = [
    { value: `ip:${clientIp ?? 'unknown'}` },
    ...additionalKeys.map((value) => ({ value })),
  ]
  return checkRateLimits(scope, keys)
}

/** Use workspace, user, and request-IP buckets for authenticated operations. */
export async function enforceAuthenticatedRateLimit(scope: RateLimitScope, workspaceId: string, userId: string) {
  let clientIp: string | null = null
  try {
    clientIp = getRequestIp(await headers())
  } catch {
    // Unit callers and non-request server jobs still have authenticated
    // workspace/user keys; the request-IP bucket is an additional signal.
  }
  const keys = [
    { value: `workspace:${workspaceId}` },
    { value: `user:${userId}` },
    ...(clientIp ? [{ value: `ip:${clientIp}` }] : []),
  ]
  await enforceRateLimits(scope, keys)
}

export function getRequestIp(request: Pick<Request, 'headers'> | Headers) {
  const requestHeaders = request instanceof Headers ? request : request.headers
  return getLinkOpenMetadata({ headers: requestHeaders, url: 'https://repoview.local' }).publicIp ?? null
}

export function getPublicShareRateLimitKey(rawToken: string) {
  return `share-token:${hashShareToken(rawToken)}`
}

export function hashRateLimitKey(value: string) {
  const salt = getRateLimitEnv().IP_HASH_SALT
  return createHash('sha256').update(`${salt}:rate-limit:${value}`, 'utf8').digest('hex')
}

export function rateLimitResponse(decision: RateLimitDecision) {
  const reset = Math.ceil(new Date(decision.resetAt).getTime() / 1000)
  return new Response(JSON.stringify({ error: 'rate_limited', retryAfterSeconds: decision.retryAfterSeconds }), {
    status: 429,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'Retry-After': String(decision.retryAfterSeconds),
      'X-RateLimit-Limit': String(decision.limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(reset),
      'RateLimit': `limit=${decision.limit}; remaining=0; reset=${reset}`,
    },
  })
}

export function rateLimitUnavailableResponse() {
  return new Response(JSON.stringify({ error: 'rate_limit_unavailable' }), {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'Retry-After': '30',
    },
  })
}
