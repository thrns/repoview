import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

export type SystemAdminOverview = {
  workspaceCounts: {
    active: number
    deleting: number
    deleted: number
  }
  installationCounts: {
    active: number
    suspended: number
    deleted: number
    pending: number
  }
  failedWebhooks: Array<{
    deliveryId: string
    event: string
    action: string
    installationId: number | null
    error: string | null
    receivedAt: string
  }>
  failedNotifications: Array<{
    workspaceId: string
    notificationKind: string
    status: string
    error: string | null
    createdAt: string
  }>
  rateLimitScopes: Array<{ scope: string; bucketCount: number }>
  quotaUsage: Array<{ scope: string; usage: number }>
  generatedAt: string
}

/**
 * Operator telemetry is intentionally metadata-only. In particular, this
 * query never selects repository owner/name, file paths, source, share tokens,
 * notification recipients, IP hashes, or any other customer content.
 */
export async function getSystemAdminOverview(admin: AdminClient = createSupabaseAdminClient()): Promise<SystemAdminOverview> {
  const [workspacesResult, installationsResult, webhooksResult, notificationsResult, rateLimitsResult, quotasResult] = await Promise.all([
    admin.from('workspaces').select('status').limit(5000),
    admin.from('github_installations').select('status').limit(5000),
    admin
      .from('github_webhook_deliveries')
      .select('delivery_id, event, action, installation_id, error, received_at')
      .eq('status', 'failed')
      .order('received_at', { ascending: false })
      .limit(12),
    admin
      .from('notification_deliveries')
      .select('workspace_id, notification_kind, status, last_error, created_at')
      .in('status', ['failed', 'permanent'])
      .order('created_at', { ascending: false })
      .limit(12),
    admin.from('rate_limit_buckets').select('scope').limit(5000),
    admin.from('quota_counters').select('scope, usage').limit(5000),
  ])

  if (workspacesResult.error || installationsResult.error || webhooksResult.error || notificationsResult.error || rateLimitsResult.error || quotasResult.error) {
    throw new Error('RepoView system telemetry could not be loaded.')
  }

  const workspaceCounts = countStatuses(workspacesResult.data ?? [], ['active', 'deleting', 'deleted'] as const)
  const installationCounts = countStatuses(installationsResult.data ?? [], ['active', 'suspended', 'deleted', 'pending_migration'] as const)
  const rateLimitScopes = countByScope(rateLimitsResult.data ?? [])
  const quotaUsage = sumQuotaUsage(quotasResult.data ?? [])

  return {
    workspaceCounts: {
      active: workspaceCounts.active,
      deleting: workspaceCounts.deleting,
      deleted: workspaceCounts.deleted,
    },
    installationCounts: {
      active: installationCounts.active,
      suspended: installationCounts.suspended,
      deleted: installationCounts.deleted,
      pending: installationCounts.pending_migration,
    },
    failedWebhooks: (webhooksResult.data ?? []).map((row) => ({
      deliveryId: row.delivery_id,
      event: row.event,
      action: row.action,
      installationId: row.installation_id,
      error: row.error,
      receivedAt: row.received_at,
    })),
    failedNotifications: (notificationsResult.data ?? []).map((row) => ({
      workspaceId: row.workspace_id,
      notificationKind: row.notification_kind,
      status: row.status,
      error: row.last_error,
      createdAt: row.created_at,
    })),
    rateLimitScopes,
    quotaUsage,
    generatedAt: new Date().toISOString(),
  }
}

function countStatuses<T extends string, R extends readonly T[]>(rows: Array<{ status: T }>, statuses: R) {
  const result = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<R[number], number>
  for (const row of rows) {
    if (row.status in result) result[row.status as R[number]] += 1
  }
  return result
}

function countByScope(rows: Array<{ scope: string }>) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.scope, (counts.get(row.scope) ?? 0) + 1)
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).map(([scope, bucketCount]) => ({ scope, bucketCount }))
}

function sumQuotaUsage(rows: Array<{ scope: string; usage: number }>) {
  const sums = new Map<string, number>()
  for (const row of rows) sums.set(row.scope, (sums.get(row.scope) ?? 0) + row.usage)
  return [...sums.entries()].sort((left, right) => right[1] - left[1]).map(([scope, usage]) => ({ scope, usage }))
}
