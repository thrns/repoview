import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import { runAccountDeletionCleanup } from '../account/deletion-job'
import {
  getRetentionCutoff,
  normalizeAnalyticsRetentionDays,
  RETENTION_BATCH_SIZE,
  RETENTION_DAYS,
  RETENTION_MAX_BATCHES_PER_CATEGORY,
} from '../retention-policy'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type RetentionTable =
  | 'audit_logs'
  | 'account_deletion_jobs'
  | 'account_lifecycle_audit'
  | 'account_step_up_confirmations'
  | 'github_webhook_deliveries'
  | 'file_engagement'
  | 'github_connection_transactions'
  | 'github_installations'
  | 'notification_deliveries'
  | 'notification_settings'
  | 'repository_events'
  | 'repositories'
  | 'rate_limit_buckets'
  | 'quota_counters'
  | 'quota_resource_reservations'
  | 'retention_cleanup_runs'
  | 'share_access_attempts'
  | 'share_recipients'
  | 'shares'
  | 'system_admin_audit_logs'
  | 'viewer_privacy_preferences'
  | 'viewer_sessions'
  | 'view_events'
  | 'viewers'
  | 'workspace_members'
  | 'workspaces'

type AnalyticsRetentionGroup = {
  days: 30 | 90 | 180
  workspaceIds: string[]
}

export type RetentionCleanupSummary = {
  referenceTime: string
  cutoffs: Record<string, string>
  processed: Record<string, number>
  totalProcessed: number
  accountDeletion: Awaited<ReturnType<typeof runAccountDeletionCleanup>>
}

const SHARE_DEPENDENCY_TABLES: Array<{ table: RetentionTable; column: string }> = [
  { table: 'view_events', column: 'share_id' },
  { table: 'repository_events', column: 'share_id' },
  { table: 'file_engagement', column: 'share_id' },
  { table: 'viewer_sessions', column: 'share_id' },
  { table: 'notification_deliveries', column: 'share_id' },
  { table: 'share_access_attempts', column: 'share_id' },
  { table: 'share_recipients', column: 'share_id' },
]

const WORKSPACE_DATA_TABLES: Array<{ table: RetentionTable; column: string }> = [
  { table: 'notification_deliveries', column: 'workspace_id' },
  { table: 'repository_events', column: 'workspace_id' },
  { table: 'view_events', column: 'workspace_id' },
  { table: 'file_engagement', column: 'workspace_id' },
  { table: 'viewer_sessions', column: 'workspace_id' },
  { table: 'viewers', column: 'workspace_id' },
  { table: 'share_access_attempts', column: 'workspace_id' },
  { table: 'share_recipients', column: 'workspace_id' },
  { table: 'shares', column: 'workspace_id' },
  { table: 'repositories', column: 'workspace_id' },
  { table: 'github_connection_transactions', column: 'workspace_id' },
  { table: 'github_installations', column: 'workspace_id' },
  { table: 'notification_settings', column: 'workspace_id' },
  { table: 'audit_logs', column: 'workspace_id' },
  { table: 'quota_counters', column: 'workspace_id' },
  { table: 'quota_resource_reservations', column: 'workspace_id' },
  { table: 'workspace_members', column: 'workspace_id' },
]

export async function runRetentionCleanup({
  admin = createSupabaseAdminClient(),
  now = new Date(),
  batchSize = RETENTION_BATCH_SIZE,
  maxBatches = RETENTION_MAX_BATCHES_PER_CATEGORY,
}: {
  admin?: AdminClient
  now?: Date
  batchSize?: number
  maxBatches?: number
} = {}): Promise<RetentionCleanupSummary> {
  const referenceTime = now.toISOString()
  const cutoffs = {
    repositoryViewEvents: getRetentionCutoff(now, RETENTION_DAYS.repositoryViewEvents),
    fileEngagement: getRetentionCutoff(now, RETENTION_DAYS.fileEngagement),
    viewerSessions: getRetentionCutoff(now, RETENTION_DAYS.viewerSessions),
    persistentViewerIdentifiers: getRetentionCutoff(now, RETENTION_DAYS.persistentViewerIdentifiers),
    networkLocationMetadata: getRetentionCutoff(now, RETENTION_DAYS.networkLocationMetadata),
    shareAccessAttempts: getRetentionCutoff(now, RETENTION_DAYS.shareAccessAttempts),
    notificationDeliveryLogs: getRetentionCutoff(now, RETENTION_DAYS.notificationDeliveryLogs),
    githubWebhookDeliveries: getRetentionCutoff(now, RETENTION_DAYS.githubWebhookDeliveries),
    retentionCleanupRuns: getRetentionCutoff(now, RETENTION_DAYS.retentionCleanupRuns),
    viewerPrivacyPreferences: getRetentionCutoff(now, RETENTION_DAYS.viewerPrivacyPreferences),
    accountDeletionJobs: getRetentionCutoff(now, RETENTION_DAYS.accountDeletionJobs),
    accountLifecycleAudit: getRetentionCutoff(now, RETENTION_DAYS.accountLifecycleAudit),
    systemAdminAuditLogs: getRetentionCutoff(now, RETENTION_DAYS.systemAdminAuditLogs),
    revokedExpiredShareMetadata: getRetentionCutoff(now, RETENTION_DAYS.revokedExpiredShareMetadata),
    deletedAccountsWorkspaces: getRetentionCutoff(now, RETENTION_DAYS.deletedAccountsWorkspaces),
    securityAuditLogs: getRetentionCutoff(now, RETENTION_DAYS.securityAuditLogs),
    rateLimitBuckets: getRetentionCutoff(now, RETENTION_DAYS.rateLimitBuckets),
    quotaCounters: getRetentionCutoff(now, RETENTION_DAYS.quotaCounters),
  }
  const analyticsRetentionGroups = await getAnalyticsRetentionGroups(admin)

  const processed: Record<string, number> = {}
  processed.repositoryViewEvents = await deleteOldRowsByAnalyticsRetention(admin, 'view_events', 'created_at', analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.repositoryEvents = await deleteOldRowsByAnalyticsRetention(admin, 'repository_events', 'occurred_at', analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.fileEngagement = await deleteOldRowsByAnalyticsRetention(admin, 'file_engagement', 'last_viewed_at', analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.notificationDeliveryLogs = await deleteOldRows(admin, 'notification_deliveries', 'created_at', cutoffs.notificationDeliveryLogs, batchSize, maxBatches)
  processed.githubWebhookDeliveries = await deleteOldWebhookDeliveries(admin, cutoffs.githubWebhookDeliveries, batchSize, maxBatches)
  processed.expiredGithubConnectionTransactions = await deleteOldRows(admin, 'github_connection_transactions', 'expires_at', now, batchSize, maxBatches)
  processed.expiredAccountStepUpConfirmations = await deleteOldRows(admin, 'account_step_up_confirmations', 'expires_at', now, batchSize, maxBatches)
  processed.viewerPrivacyPreferences = await deleteOldRows(admin, 'viewer_privacy_preferences', 'updated_at', cutoffs.viewerPrivacyPreferences, batchSize, maxBatches)
  processed.shareAccessAttempts = await deleteOldRows(admin, 'share_access_attempts', 'created_at', cutoffs.shareAccessAttempts, batchSize, maxBatches)
  processed.securityAuditLogs = await deleteOldRows(admin, 'audit_logs', 'created_at', cutoffs.securityAuditLogs, batchSize, maxBatches)
  processed.systemAdminAuditLogs = await deleteOldRows(admin, 'system_admin_audit_logs', 'created_at', cutoffs.systemAdminAuditLogs, batchSize, maxBatches)
  processed.retentionCleanupRuns = await deleteOldRetentionCleanupRuns(admin, cutoffs.retentionCleanupRuns, now, batchSize, maxBatches)
  processed.accountDeletionJobHistory = await deleteOldLifecycleRows(admin, 'account_deletion_jobs', cutoffs.accountDeletionJobs, batchSize, maxBatches)
  processed.accountLifecycleAudit = await deleteOldLifecycleRows(admin, 'account_lifecycle_audit', cutoffs.accountLifecycleAudit, batchSize, maxBatches)
  processed.rateLimitBuckets = await deleteOldRateLimitBuckets(admin, cutoffs.rateLimitBuckets, batchSize, maxBatches)
  processed.quotaCounters = await deleteOldQuotaCounters(admin, cutoffs.quotaCounters, batchSize, maxBatches)
  processed.quotaResourceReservations = await deleteOldRows(admin, 'quota_resource_reservations', 'expires_at', now, batchSize, maxBatches)
  processed.networkLocationMetadata = await scrubNetworkLocationMetadata(admin, cutoffs.networkLocationMetadata, referenceTime, batchSize, maxBatches)
  processed.analyticsDependentNotificationDeliveries = await deleteNotificationDeliveriesForOldSessions(admin, analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.viewerSessions = await deleteOldViewerSessions(admin, analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.persistentViewerIdentifiers = await deleteOldViewerIdentifiers(admin, analyticsRetentionGroups, now, batchSize, maxBatches)
  processed.revokedExpiredShares = await scrubAndDeleteRevokedExpiredShares(admin, cutoffs.revokedExpiredShareMetadata, referenceTime, batchSize, maxBatches)
  const accountDeletion = await runAccountDeletionCleanup({ admin, batchSize })
  processed.accountDeletionJobs = accountDeletion.jobsCompleted + accountDeletion.jobsFailed
  processed.accountDeletionRows = accountDeletion.rowsDeleted
  processed.deletedAccountsWorkspaces = await finalizeDeletedWorkspaces(admin, cutoffs.deletedAccountsWorkspaces, batchSize)

  const totalProcessed = Object.values(processed).reduce((total, count) => total + count, 0)
  return {
    referenceTime,
    cutoffs: Object.fromEntries(Object.entries(cutoffs).map(([key, value]) => [key, value.toISOString()])),
    processed,
    totalProcessed,
    accountDeletion,
  }
}

async function deleteOldRateLimitBuckets(admin: AdminClient, cutoff: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from('rate_limit_buckets')
      .select('key_hash')
      .lt('updated_at', cutoff.toISOString())
      .order('updated_at', { ascending: true })
      .limit(batchSize)
    if (error) throw error
    const keys = ((data ?? []) as Array<{ key_hash?: string }>).flatMap((row) => row.key_hash ? [row.key_hash] : [])
    if (keys.length === 0) break
    const { error: deleteError } = await admin.from('rate_limit_buckets').delete().in('key_hash', keys)
    if (deleteError) throw deleteError
    processed += keys.length
    if (keys.length < batchSize) break
  }
  return processed
}

async function deleteOldQuotaCounters(admin: AdminClient, cutoff: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from('quota_counters')
      .select('scope, workspace_id, subject_id, period_start')
      .lt('updated_at', cutoff.toISOString())
      .order('updated_at', { ascending: true })
      .limit(batchSize)
    if (error) throw error
    const rows = (data ?? []) as Array<{ scope: string; workspace_id: string; subject_id: string; period_start: string }>
    if (rows.length === 0) break

    for (const row of rows) {
      const { error: deleteError } = await admin
        .from('quota_counters')
        .delete()
        .eq('scope', row.scope)
        .eq('workspace_id', row.workspace_id)
        .eq('subject_id', row.subject_id)
        .eq('period_start', row.period_start)
      if (deleteError) throw deleteError
    }
    processed += rows.length
    if (rows.length < batchSize) break
  }
  return processed
}

async function deleteOldRows(admin: AdminClient, table: RetentionTable, column: string, cutoff: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const ids = await fetchOldIds(admin, table, column, cutoff, batchSize)
    if (ids.length === 0) break
    await deleteIds(admin, table, ids)
    processed += ids.length
    if (ids.length < batchSize) break
  }
  return processed
}

async function deleteOldWebhookDeliveries(admin: AdminClient, cutoff: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from('github_webhook_deliveries')
      .select('delivery_id')
      .lt('received_at', cutoff.toISOString())
      .order('received_at', { ascending: true })
      .limit(batchSize)
    if (error) throw error
    const deliveryIds = ((data ?? []) as Array<{ delivery_id?: string }>).flatMap((row) => row.delivery_id ? [row.delivery_id] : [])
    if (deliveryIds.length === 0) break
    const { error: deleteError } = await admin
      .from('github_webhook_deliveries')
      .delete()
      .in('delivery_id', deliveryIds)
    if (deleteError) throw deleteError
    processed += deliveryIds.length
    if (deliveryIds.length < batchSize) break
  }
  return processed
}

async function deleteOldLifecycleRows(admin: AdminClient, table: 'account_deletion_jobs' | 'account_lifecycle_audit', cutoff: Date, batchSize: number, maxBatches: number) {
  // Incomplete deletion work is deliberately never reaped by retention:
  // failed jobs and their lifecycle record remain observable and retryable.
  // Only completed progress ledgers are aged out.
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from(table)
      .select('id')
      .in('status', ['completed'])
      .lt('updated_at', cutoff.toISOString())
      .order('updated_at', { ascending: true })
      .limit(batchSize)
    if (error) throw error
    const ids = rowsToIds(data)
    if (ids.length === 0) break
    await deleteIds(admin, table, ids)
    processed += ids.length
    if (ids.length < batchSize) break
  }
  return processed
}

async function deleteOldRetentionCleanupRuns(admin: AdminClient, cutoff: Date, now: Date, batchSize: number, maxBatches: number) {
  // A run that stopped in `running` is retained long enough to be diagnosed,
  // then converted to a bounded failed record before normal retention applies.
  const staleCutoff = getRetentionCutoff(now, 1)
  const { data: staleRuns, error: staleLookupError } = await admin
    .from('retention_cleanup_runs')
    .select('id')
    .eq('status', 'running')
    .lt('started_at', staleCutoff.toISOString())
    .order('started_at', { ascending: true })
    .limit(batchSize)
  if (staleLookupError) throw staleLookupError
  const staleIds = rowsToIds(staleRuns)
  if (staleIds.length > 0) {
    const { error: staleError } = await admin
      .from('retention_cleanup_runs')
      .update({ status: 'failed', completed_at: now.toISOString(), error: 'stale_run' } as never)
      .in('id', staleIds as never)
    if (staleError) throw staleError
  }

  return deleteOldRows(admin, 'retention_cleanup_runs', 'completed_at', cutoff, batchSize, maxBatches)
}

async function deleteOldRowsByAnalyticsRetention(
  admin: AdminClient,
  table: RetentionTable,
  column: string,
  groups: AnalyticsRetentionGroup[],
  now: Date,
  batchSize: number,
  maxBatches: number,
) {
  let processed = 0
  const groupLimit = Math.max(1, Math.floor(batchSize / Math.max(groups.length, 1)))
  for (const group of groups) {
    const cutoff = getRetentionCutoff(now, group.days)
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const ids = await fetchOldIdsForWorkspaces(admin, table, column, cutoff, group.workspaceIds, groupLimit)
      if (ids.length === 0) break
      await deleteIds(admin, table, ids)
      processed += ids.length
      if (ids.length < groupLimit) break
    }
  }
  return processed
}

async function scrubNetworkLocationMetadata(admin: AdminClient, cutoff: Date, scrubbedAt: string, batchSize: number, maxBatches: number) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from('viewer_sessions')
      .select('id')
      .lt('first_seen_at', cutoff.toISOString())
      .is('network_metadata_scrubbed_at', null)
      .order('first_seen_at', { ascending: true })
      .limit(batchSize)
    if (error) throw error
    const ids = rowsToIds(data)
    if (ids.length === 0) break

    const { error: updateError } = await admin.from('viewer_sessions').update({
      ip_hash: null,
      country: null,
      region: null,
      city: null,
      vpn_indication: null,
      proxy_indication: null,
      tor_indication: null,
      datacenter_indication: null,
      security_signals: {},
      is_probable_bot: false,
      network_metadata_scrubbed_at: scrubbedAt,
    } as never).in('id', ids as never)
    if (updateError) throw updateError
    processed += ids.length
    if (ids.length < batchSize) break
  }
  return processed
}

async function deleteOldViewerSessions(admin: AdminClient, groups: AnalyticsRetentionGroup[], now: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  const groupLimit = Math.max(1, Math.floor(batchSize / Math.max(groups.length, 1)))
  for (const group of groups) {
    const cutoff = getRetentionCutoff(now, group.days)
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const ids = await fetchOldIdsForWorkspaces(admin, 'viewer_sessions', 'last_seen_at', cutoff, group.workspaceIds, groupLimit)
      if (ids.length === 0) break
      const deletable: Array<string | number> = []
      for (const id of ids) {
        const hasRecentDependency = await hasAnyRows(admin, [
          { table: 'view_events', column: 'session_id' },
          { table: 'repository_events', column: 'session_id' },
          { table: 'file_engagement', column: 'session_id' },
        ], id)
        if (!hasRecentDependency) deletable.push(id)
      }
      if (deletable.length > 0) {
        await deleteIds(admin, 'viewer_sessions', deletable)
        processed += deletable.length
      }
      if (ids.length < groupLimit || deletable.length === 0) break
    }
  }
  return processed
}

async function deleteNotificationDeliveriesForOldSessions(admin: AdminClient, groups: AnalyticsRetentionGroup[], now: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  const groupLimit = Math.max(1, Math.floor(batchSize / Math.max(groups.length, 1)))
  for (const group of groups) {
    const cutoff = getRetentionCutoff(now, group.days)
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const sessionIds = await fetchOldIdsForWorkspaces(admin, 'viewer_sessions', 'last_seen_at', cutoff, group.workspaceIds, groupLimit)
      if (sessionIds.length === 0) break
      processed += await deleteRowsForValues(admin, 'notification_deliveries', 'session_id', sessionIds, batchSize, maxBatches)
      if (sessionIds.length < groupLimit) break
    }
  }
  return processed
}

async function deleteOldViewerIdentifiers(admin: AdminClient, groups: AnalyticsRetentionGroup[], now: Date, batchSize: number, maxBatches: number) {
  let processed = 0
  const groupLimit = Math.max(1, Math.floor(batchSize / Math.max(groups.length, 1)))
  for (const group of groups) {
    const cutoff = getRetentionCutoff(now, group.days)
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const ids = await fetchOldIdsForWorkspaces(admin, 'viewers', 'last_seen_at', cutoff, group.workspaceIds, groupLimit)
      if (ids.length === 0) break
      for (const reference of [
        { table: 'viewer_sessions' as const, column: 'viewer_id' },
        { table: 'file_engagement' as const, column: 'viewer_id' },
        { table: 'repository_events' as const, column: 'viewer_id' },
      ]) {
        const { error } = await admin.from(reference.table).update({ viewer_id: null } as never).in(reference.column, ids as never)
        if (error) throw error
      }
      await deleteIds(admin, 'viewers', ids)
      processed += ids.length
      if (ids.length < groupLimit) break
    }
  }
  return processed
}

async function scrubAndDeleteRevokedExpiredShares(admin: AdminClient, cutoff: Date, scrubbedAt: string, batchSize: number, maxBatches: number) {
  const { data, error } = await admin
    .from('shares')
    .select('id, retention_scrubbed_at')
    .or(`revoked_at.lt.${cutoff.toISOString()},expires_at.lt.${cutoff.toISOString()}`)
    .order('updated_at', { ascending: true })
    .limit(batchSize)
  if (error) throw error
  const candidates = (data ?? []) as Array<{ id: string; retention_scrubbed_at: string | null }>
  if (candidates.length === 0) return 0

  const ids = candidates.map((candidate) => candidate.id)
  const { error: recipientError } = await admin.from('share_recipients').delete().in('share_id', ids)
  if (recipientError) throw recipientError
  await deleteRowsForValues(admin, 'notification_deliveries', 'share_id', ids, batchSize, maxBatches)

  const unscrubbedIds = candidates.filter((candidate) => !candidate.retention_scrubbed_at).map((candidate) => candidate.id)
  if (unscrubbedIds.length > 0) {
    const { error: scrubError } = await admin.from('shares').update({
      recipient_label: null,
      commit_sha: null,
      ref: '',
      note: null,
      notify_on_view: false,
      allow_download: false,
      rules: {},
      created_by: null,
      retention_scrubbed_at: scrubbedAt,
    } as never).in('id', unscrubbedIds)
    if (scrubError) throw scrubError
  }

  const deletable: string[] = []
  for (const candidate of candidates) {
    if (await hasAnyRows(admin, SHARE_DEPENDENCY_TABLES, candidate.id)) continue
    deletable.push(candidate.id)
  }
  if (deletable.length > 0) {
    const { error: deleteError } = await admin.from('shares').delete().in('id', deletable)
    if (deleteError) throw deleteError
  }
  return candidates.length
}

async function finalizeDeletedWorkspaces(admin: AdminClient, cutoff: Date, batchSize: number) {
  const { data, error } = await admin
    .from('workspaces')
    .select('id')
    .eq('status', 'deleted')
    .lt('deletion_started_at', cutoff.toISOString())
    .order('deletion_started_at', { ascending: true })
    .limit(batchSize)
  if (error) throw error
  let processed = 0
  for (const workspace of (data ?? []) as Array<{ id: string }>) {
    if (await hasAnyRows(admin, WORKSPACE_DATA_TABLES, workspace.id)) continue
    const { error: deleteError } = await admin.from('workspaces').delete().eq('id', workspace.id)
    if (deleteError) throw deleteError
    processed += 1
  }
  return processed
}

async function fetchOldIds(admin: AdminClient, table: RetentionTable, column: string, cutoff: Date, batchSize: number) {
  const { data, error } = await admin
    .from(table)
    .select('id')
    .lt(column, cutoff.toISOString())
    .order(column, { ascending: true })
    .limit(batchSize)
  if (error) throw error
  return rowsToIds(data)
}

async function fetchOldIdsForWorkspaces(admin: AdminClient, table: RetentionTable, column: string, cutoff: Date, workspaceIds: string[], batchSize: number) {
  if (workspaceIds.length === 0) return []
  const { data, error } = await admin
    .from(table)
    .select('id')
    .in('workspace_id', workspaceIds)
    .lt(column, cutoff.toISOString())
    .order(column, { ascending: true })
    .limit(batchSize)
  if (error) throw error
  return rowsToIds(data)
}

async function getAnalyticsRetentionGroups(admin: AdminClient): Promise<AnalyticsRetentionGroup[]> {
  const [{ data: workspaces, error: workspaceError }, { data: settings, error: settingsError }] = await Promise.all([
    admin.from('workspaces').select('id'),
    admin.from('notification_settings').select('workspace_id, analytics_retention_days'),
  ])
  if (workspaceError) throw workspaceError
  if (settingsError) throw settingsError

  const settingsByWorkspace = new Map((settings ?? []).map((setting) => [setting.workspace_id, setting.analytics_retention_days]))
  const grouped = new Map<AnalyticsRetentionGroup['days'], string[]>()
  for (const workspace of (workspaces ?? []) as Array<{ id: string }>) {
    const days = normalizeAnalyticsRetentionDays(settingsByWorkspace.get(workspace.id))
    const ids = grouped.get(days) ?? []
    ids.push(workspace.id)
    grouped.set(days, ids)
  }
  return [30, 90, 180].flatMap((days) => {
    const workspaceIds = grouped.get(days as AnalyticsRetentionGroup['days']) ?? []
    return workspaceIds.length > 0 ? [{ days: days as AnalyticsRetentionGroup['days'], workspaceIds }] : []
  })
}

async function deleteIds(admin: AdminClient, table: RetentionTable, ids: Array<string | number>) {
  const { error } = await admin.from(table).delete().in('id', ids as never)
  if (error) throw error
}

async function deleteRowsForValues(
  admin: AdminClient,
  table: 'notification_deliveries',
  column: string,
  values: Array<string | number>,
  batchSize: number,
  maxBatches: number,
) {
  let processed = 0
  for (let batch = 0; batch < maxBatches; batch += 1) {
    const { data, error } = await admin
      .from(table)
      .select('id')
      .in(column, values as never)
      .limit(batchSize)
    if (error) throw error
    const ids = rowsToIds(data)
    if (ids.length === 0) break
    await deleteIds(admin, table, ids)
    processed += ids.length
    if (ids.length < batchSize) break
  }
  return processed
}

async function hasAnyRows(admin: AdminClient, dependencies: Array<{ table: RetentionTable; column: string }>, value: string | number) {
  for (const dependency of dependencies) {
    const { data, error } = await admin
      .from(dependency.table)
      .select('id')
      .eq(dependency.column, value as never)
      .limit(1)
    if (error) throw error
    if ((data ?? []).length > 0) return true
  }
  return false
}

function rowsToIds(rows: unknown) {
  return ((rows ?? []) as Array<{ id?: string | number }>).flatMap((row) => row.id === undefined ? [] : [row.id])
}
