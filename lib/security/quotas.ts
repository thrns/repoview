import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'

export type QuotaScope =
  | 'github-installations'
  | 'enabled-repositories'
  | 'active-shares'
  | 'shares-created-daily'
  | 'analytics-events-session'
  | 'analytics-events-workspace-daily'
  | 'downloads-session'
  | 'notification-emails-workspace-daily'

type QuotaPolicy = {
  limit: number
  label: string
  kind: 'resource' | 'counter'
  reset: 'never' | 'daily' | 'session'
}

/**
 * Product safeguards, not billing entitlements. Keep these values generous
 * enough for normal use and change them centrally when product capacity grows.
 */
export const QUOTA_POLICIES: Record<QuotaScope, QuotaPolicy> = {
  'github-installations': { limit: 10, label: 'connected GitHub installations', kind: 'resource', reset: 'never' },
  'enabled-repositories': { limit: 100, label: 'enabled repositories', kind: 'resource', reset: 'never' },
  'active-shares': { limit: 1_000, label: 'active shares', kind: 'resource', reset: 'never' },
  'shares-created-daily': { limit: 100, label: 'shares created today', kind: 'counter', reset: 'daily' },
  'analytics-events-session': { limit: 1_000, label: 'analytics events in this viewer session', kind: 'counter', reset: 'session' },
  'analytics-events-workspace-daily': { limit: 10_000, label: 'analytics events for this workspace today', kind: 'counter', reset: 'daily' },
  'downloads-session': { limit: 100, label: 'downloads in this viewer session', kind: 'counter', reset: 'session' },
  'notification-emails-workspace-daily': { limit: 1_000, label: 'notification emails for this workspace today', kind: 'counter', reset: 'daily' },
}

export type QuotaDecision = {
  scope: QuotaScope
  allowed: boolean
  usage: number
  limit: number
  remaining: number
  resetAt: string | null
  retryAfterSeconds: number
}

export type QuotaReservation = {
  scope: QuotaScope
  workspaceId: string
  subjectId: string
  periodStart: string
  increment: number
  resetAt: string
}

export class QuotaUnavailableError extends Error {
  constructor() {
    super('Quota protection is temporarily unavailable.')
    this.name = 'QuotaUnavailableError'
  }
}

export class QuotaExceededError extends Error {
  readonly decision: QuotaDecision

  constructor(decision: QuotaDecision) {
    super(`This workspace has reached its limit for ${QUOTA_POLICIES[decision.scope].label} (${decision.limit}).`)
    this.name = 'QuotaExceededError'
    this.decision = decision
  }
}

/** Reserve a bounded, tenant-scoped unit of work atomically. */
export async function reserveQuota(
  scope: QuotaScope,
  workspaceId: string,
  subjectId: string,
  increment = 1,
  now = new Date(),
  admin = createSupabaseAdminClient(),
): Promise<QuotaReservation> {
  const policy = QUOTA_POLICIES[scope]
  if (policy.kind !== 'counter' || !Number.isSafeInteger(increment) || increment <= 0) {
    throw new QuotaUnavailableError()
  }

  const period = getQuotaPeriod(policy.reset, now)
  const { data, error } = await admin.rpc('consume_workspace_quota', {
    target_scope: scope,
    target_workspace_id: workspaceId,
    target_subject_id: subjectId,
    target_period_start: period.periodStart,
    target_reset_at: period.resetAt,
    target_increment: increment,
    target_limit: policy.limit,
  })

  if (error || !data?.[0]) throw new QuotaUnavailableError()
  const row = data[0] as { allowed: boolean; usage: number; remaining: number; retry_after_seconds: number; reset_at: string }
  const decision: QuotaDecision = {
    scope,
    allowed: row.allowed === true,
    usage: Math.max(0, Number(row.usage ?? 0)),
    limit: policy.limit,
    remaining: Math.max(0, Number(row.remaining ?? 0)),
    resetAt: row.reset_at,
    retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds ?? 1)),
  }

  if (!decision.allowed) throw new QuotaExceededError(decision)

  return {
    scope,
    workspaceId,
    subjectId,
    periodStart: period.periodStart,
    increment,
    resetAt: period.resetAt,
  }
}

/** Release a reservation when its durable write did not happen. */
export async function releaseQuota(reservation: QuotaReservation, admin = createSupabaseAdminClient()) {
  const { error } = await admin.rpc('release_workspace_quota', {
    target_scope: reservation.scope,
    target_workspace_id: reservation.workspaceId,
    target_subject_id: reservation.subjectId,
    target_period_start: reservation.periodStart,
    target_increment: reservation.increment,
  })
  if (error) throw new QuotaUnavailableError()
}

/** Enforce a live workspace resource count before creating/enabling it. */
export async function assertWorkspaceResourceQuota(
  scope: Extract<QuotaScope, 'github-installations' | 'enabled-repositories' | 'active-shares'>,
  workspaceId: string,
  increment = 1,
  admin = createSupabaseAdminClient(),
  now = new Date(),
) {
  const policy = QUOTA_POLICIES[scope]
  const usage = await getWorkspaceResourceUsage(scope, workspaceId, admin, now)
  const decision: QuotaDecision = {
    scope,
    allowed: usage + increment <= policy.limit,
    usage,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - usage),
    resetAt: null,
    retryAfterSeconds: 3600,
  }
  if (!decision.allowed) throw new QuotaExceededError(decision)
  return decision
}

export type WorkspaceQuotaUsage = {
  githubInstallations: UsageValue
  enabledRepositories: UsageValue
  activeShares: UsageValue
  sharesCreatedToday: UsageValue
  analyticsEventsToday: UsageValue
  notificationEmailsToday: UsageValue
}

export type UsageValue = {
  used: number
  limit: number
  remaining: number
}

/** Read only the capacity figures that are useful to a workspace owner. */
export async function getWorkspaceQuotaUsage(workspaceId: string, admin = createSupabaseAdminClient(), now = new Date()): Promise<WorkspaceQuotaUsage> {
  const [githubInstallations, enabledRepositories, activeShares, counters] = await Promise.all([
    getWorkspaceResourceUsage('github-installations', workspaceId, admin, now),
    getWorkspaceResourceUsage('enabled-repositories', workspaceId, admin, now),
    getWorkspaceResourceUsage('active-shares', workspaceId, admin, now),
    getWorkspaceDailyCounters(workspaceId, admin, now),
  ])

  return {
    githubInstallations: usageValue('github-installations', githubInstallations),
    enabledRepositories: usageValue('enabled-repositories', enabledRepositories),
    activeShares: usageValue('active-shares', activeShares),
    sharesCreatedToday: usageValue('shares-created-daily', counters['shares-created-daily'] ?? 0),
    analyticsEventsToday: usageValue('analytics-events-workspace-daily', counters['analytics-events-workspace-daily'] ?? 0),
    notificationEmailsToday: usageValue('notification-emails-workspace-daily', counters['notification-emails-workspace-daily'] ?? 0),
  }
}

export function quotaResponse(error: QuotaExceededError) {
  const decision = error.decision
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    'Retry-After': String(decision.retryAfterSeconds),
    'X-Quota-Scope': decision.scope,
    'X-Quota-Limit': String(decision.limit),
    'X-Quota-Remaining': String(decision.remaining),
  }
  return new Response(JSON.stringify({
    error: 'quota_exceeded',
    message: error.message,
    scope: decision.scope,
    limit: decision.limit,
    usage: decision.usage,
    retryAfterSeconds: decision.retryAfterSeconds,
  }), { status: 429, headers })
}

export function quotaUnavailableResponse() {
  return new Response(JSON.stringify({ error: 'quota_unavailable' }), {
    status: 503,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', 'Retry-After': '30' },
  })
}

function getQuotaPeriod(reset: QuotaPolicy['reset'], now: Date) {
  if (reset === 'daily') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const resetAt = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { periodStart: start.toISOString(), resetAt: resetAt.toISOString() }
  }

  return {
    periodStart: new Date(0).toISOString(),
    resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

async function getWorkspaceResourceUsage(
  scope: Extract<QuotaScope, 'github-installations' | 'enabled-repositories' | 'active-shares'>,
  workspaceId: string,
  admin: ReturnType<typeof createSupabaseAdminClient>,
  now: Date,
) {
  if (scope === 'github-installations') {
    const { count, error } = await admin
      .from('github_installations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'suspended', 'pending_migration'])
    if (error || count === null) throw new QuotaUnavailableError()
    return count
  }

  if (scope === 'enabled-repositories') {
    const { count, error } = await admin
      .from('repositories')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('enabled', true)
    if (error || count === null) throw new QuotaUnavailableError()
    return count
  }

  const { count, error } = await admin
    .from('shares')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
  if (error || count === null) throw new QuotaUnavailableError()
  return count
}

async function getWorkspaceDailyCounters(workspaceId: string, admin: ReturnType<typeof createSupabaseAdminClient>, now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const scopes = ['shares-created-daily', 'analytics-events-workspace-daily', 'notification-emails-workspace-daily'] as const
  const { data, error } = await admin
    .from('quota_counters')
    .select('scope, usage')
    .eq('workspace_id', workspaceId)
    .eq('period_start', start)
    .in('scope', [...scopes])
  if (error) throw new QuotaUnavailableError()
  return Object.fromEntries((data ?? []).map((row) => [row.scope, Number(row.usage ?? 0)])) as Record<typeof scopes[number], number>
}

function usageValue(scope: QuotaScope, used: number): UsageValue {
  const limit = QUOTA_POLICIES[scope].limit
  return { used: Math.max(0, used), limit, remaining: Math.max(0, limit - used) }
}
