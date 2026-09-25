import 'server-only'

import { randomUUID } from 'node:crypto'

import type { Tables } from '../supabase/database.types'
import { createSupabaseAdminClient } from '../supabase/admin'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>
type AccountDeletionJob = Tables<'account_deletion_jobs'>

const ACCOUNT_DELETION_BATCH_SIZE = 100
const ACCOUNT_DELETION_MAX_JOBS_PER_RUN = 25
const ACCOUNT_DELETION_RETRY_DELAY_MS = 60_000

type WorkspaceCleanupTable =
  | 'notification_deliveries'
  | 'repository_events'
  | 'view_events'
  | 'file_engagement'
  | 'viewer_sessions'
  | 'viewers'
  | 'share_access_attempts'
  | 'share_recipients'
  | 'shares'
  | 'repositories'
  | 'github_connection_transactions'
  | 'github_installations'
  | 'notification_settings'
  | 'audit_logs'
  | 'quota_counters'
  | 'workspace_members'
  | 'workspaces'

const WORKSPACE_CLEANUP_TABLES: WorkspaceCleanupTable[] = [
  'notification_deliveries',
  'repository_events',
  'view_events',
  'file_engagement',
  'viewer_sessions',
  'viewers',
  'share_access_attempts',
  'share_recipients',
  'shares',
  'repositories',
  'github_connection_transactions',
  'github_installations',
  'notification_settings',
  'audit_logs',
  'quota_counters',
  'workspace_members',
  'workspaces',
]

const WORKSPACE_DATA_TABLES = WORKSPACE_CLEANUP_TABLES.filter((table) => table !== 'workspaces')

export type AccountDeletionCleanupSummary = {
  jobsConsidered: number
  jobsClaimed: number
  jobsCompleted: number
  jobsFailed: number
  rowsDeleted: number
}

/**
 * Advance queued account deletion jobs by one bounded step each. A job never
 * relies on a process-local cursor: the persisted phase/table index and the
 * remaining rows in the database are the cursor, so a timeout is safe to
 * retry. The claim RPC prevents two cron invocations from processing a job at
 * the same time and allows stale running jobs to resume.
 */
export async function runAccountDeletionCleanup({
  admin = createSupabaseAdminClient(),
  batchSize = ACCOUNT_DELETION_BATCH_SIZE,
  maxJobs = ACCOUNT_DELETION_MAX_JOBS_PER_RUN,
}: {
  admin?: AdminClient
  batchSize?: number
  maxJobs?: number
} = {}): Promise<AccountDeletionCleanupSummary> {
  const { data: jobs, error: jobsError } = await admin
    .from('account_deletion_jobs')
    .select('*')
    .in('status', ['queued', 'failed', 'running'])
    .order('requested_at', { ascending: true })
    .limit(maxJobs)

  if (jobsError) throw jobsError

  const summary: AccountDeletionCleanupSummary = {
    jobsConsidered: jobs?.length ?? 0,
    jobsClaimed: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    rowsDeleted: 0,
  }

  for (const job of (jobs ?? []) as AccountDeletionJob[]) {
    const lockToken = randomUUID()
    const { data: claimedData, error: claimError } = await admin.rpc('claim_account_deletion_job', {
      target_job_id: job.id,
      target_lock_token: lockToken,
    })
    if (claimError) throw claimError

    const claimedJob = Array.isArray(claimedData) ? claimedData[0] : claimedData
    if (!claimedJob?.id) continue
    summary.jobsClaimed += 1

    try {
      const result = await advanceClaimedJob(admin, claimedJob, lockToken, Math.max(1, batchSize))
      summary.rowsDeleted += result.rowsDeleted
      if (result.completed) summary.jobsCompleted += 1
    } catch (error) {
      summary.jobsFailed += 1
      await markJobFailed(admin, claimedJob.id, lockToken, error instanceof DeletionJobError ? error.code : 'cleanup_failed')
    }
  }

  return summary
}

class DeletionJobError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'DeletionJobError'
  }
}

async function advanceClaimedJob(admin: AdminClient, job: AccountDeletionJob, lockToken: string, batchSize: number) {
  if (job.phase === 'workspace_cleanup') {
    return advanceWorkspaceCleanup(admin, job, lockToken, batchSize)
  }

  if (job.phase === 'account_memberships') {
    return advanceAccountMembershipCleanup(admin, job, lockToken, batchSize)
  }

  if (job.phase === 'account_security') {
    return advanceAccountSecurityCleanup(admin, job, lockToken, batchSize)
  }

  if (job.phase === 'profile') {
    return advanceProfileCleanup(admin, job, lockToken)
  }

  if (job.phase === 'auth_delete') {
    return deleteAuthUserAndComplete(admin, job, lockToken)
  }

  throw new DeletionJobError('unknown_phase')
}

async function advanceWorkspaceCleanup(admin: AdminClient, job: AccountDeletionJob, lockToken: string, batchSize: number) {
  let tableIndex = job.cleanup_table_index
  let rowsDeleted = 0

  // Empty tables are advanced in the same invocation. Rows are still bounded
  // globally by batchSize, so a large analytics table yields and resumes at
  // its persisted table index on the next run.
  while (tableIndex < WORKSPACE_CLEANUP_TABLES.length && rowsDeleted < batchSize) {
    const table = WORKSPACE_CLEANUP_TABLES[tableIndex]
    const batch = await deleteWorkspaceTableBatch(admin, table, job.workspace_ids, batchSize - rowsDeleted)
    rowsDeleted += batch.rowsDeleted

    if (batch.hasMore) {
      await updateJob(admin, job, lockToken, {
        cleanup_table_index: tableIndex,
        rows_deleted: job.rows_deleted + rowsDeleted,
      })
      return { rowsDeleted, completed: false }
    }

    tableIndex += 1
  }

  await updateJob(admin, job, lockToken, tableIndex >= WORKSPACE_CLEANUP_TABLES.length
    ? { phase: 'account_memberships', cleanup_table_index: 0, rows_deleted: job.rows_deleted + rowsDeleted }
    : { cleanup_table_index: tableIndex, rows_deleted: job.rows_deleted + rowsDeleted })
  return { rowsDeleted, completed: false }
}

async function advanceAccountMembershipCleanup(admin: AdminClient, job: AccountDeletionJob, lockToken: string, batchSize: number) {
  if (!job.user_id) {
    await updateJob(admin, job, lockToken, { phase: 'account_security' })
    return { rowsDeleted: 0, completed: false }
  }

  const { data, error } = await admin
    .from('workspace_members')
    .select('workspace_id, user_id')
    .eq('user_id', job.user_id)
    .limit(batchSize)
  if (error) throw new DeletionJobError('workspace_members_select_failed')

  const rows = (data ?? []) as Array<{ workspace_id: string; user_id: string }>
  for (const row of rows) {
    const { error: deleteError } = await admin
      .from('workspace_members')
      .delete()
      .eq('workspace_id', row.workspace_id)
      .eq('user_id', row.user_id)
    if (deleteError) throw new DeletionJobError('workspace_members_delete_failed')
  }

  if (rows.length < batchSize) {
    await updateJob(admin, job, lockToken, { phase: 'account_security', rows_deleted: job.rows_deleted + rows.length })
  } else {
    await updateJob(admin, job, lockToken, { rows_deleted: job.rows_deleted + rows.length })
  }
  return { rowsDeleted: rows.length, completed: false }
}

async function advanceAccountSecurityCleanup(admin: AdminClient, job: AccountDeletionJob, lockToken: string, batchSize: number) {
  if (!job.user_id) {
    await updateJob(admin, job, lockToken, { phase: 'profile' })
    return { rowsDeleted: 0, completed: false }
  }

  const { data, error } = await admin
    .from('account_step_up_confirmations')
    .select('id')
    .eq('user_id', job.user_id)
    .limit(batchSize)
  if (error) throw new DeletionJobError('account_security_select_failed')

  const ids = ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
  if (ids.length > 0) {
    const { error: deleteError } = await admin.from('account_step_up_confirmations').delete().in('id', ids)
    if (deleteError) throw new DeletionJobError('account_security_delete_failed')
  }

  await updateJob(admin, job, lockToken, {
    phase: ids.length < batchSize ? 'profile' : 'account_security',
    rows_deleted: job.rows_deleted + ids.length,
  })
  return { rowsDeleted: ids.length, completed: false }
}

async function advanceProfileCleanup(admin: AdminClient, job: AccountDeletionJob, lockToken: string) {
  if (job.user_id) {
    const { error } = await admin.from('profiles').delete().eq('id', job.user_id)
    if (error) throw new DeletionJobError('profile_delete_failed')
  }
  await updateJob(admin, job, lockToken, { phase: 'auth_delete' })
  return { rowsDeleted: job.user_id ? 1 : 0, completed: false }
}

async function deleteAuthUserAndComplete(admin: AdminClient, job: AccountDeletionJob, lockToken: string) {
  if (job.user_id) {
    const { error } = await admin.auth.admin.deleteUser(job.user_id)
    if (error) throw new DeletionJobError('auth_delete_failed')
  }

  const { error } = await admin
    .from('account_deletion_jobs')
    .update({
      status: 'completed',
      phase: 'completed',
      completed_at: new Date().toISOString(),
      locked_at: null,
      lock_token: null,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', job.id)
    .eq('lock_token', lockToken)
  if (error) throw new DeletionJobError('job_complete_failed')
  return { rowsDeleted: 0, completed: true }
}

async function deleteWorkspaceTableBatch(admin: AdminClient, table: WorkspaceCleanupTable, workspaceIds: string[], batchSize: number) {
  if (workspaceIds.length === 0) return { rowsDeleted: 0, hasMore: false }

  if (table === 'quota_counters') {
    const { data, error } = await admin
      .from(table)
      .select('scope, workspace_id, subject_id, period_start')
      .in('workspace_id', workspaceIds)
      .limit(batchSize)
    if (error) throw new DeletionJobError(`${table}_select_failed`)
    const rows = (data ?? []) as Array<{ scope: string; workspace_id: string; subject_id: string; period_start: string }>
    for (const row of rows) {
      const { error: deleteError } = await admin
        .from(table)
        .delete()
        .eq('scope', row.scope)
        .eq('workspace_id', row.workspace_id)
        .eq('subject_id', row.subject_id)
        .eq('period_start', row.period_start)
      if (deleteError) throw new DeletionJobError(`${table}_delete_failed`)
    }
    return { rowsDeleted: rows.length, hasMore: rows.length === batchSize }
  }

  if (table === 'workspace_members') {
    const { data, error } = await admin
      .from(table)
      .select('workspace_id, user_id')
      .in('workspace_id', workspaceIds)
      .limit(batchSize)
    if (error) throw new DeletionJobError(`${table}_select_failed`)
    const rows = (data ?? []) as Array<{ workspace_id: string; user_id: string }>
    for (const row of rows) {
      const { error: deleteError } = await admin
        .from(table)
        .delete()
        .eq('workspace_id', row.workspace_id)
        .eq('user_id', row.user_id)
      if (deleteError) throw new DeletionJobError(`${table}_delete_failed`)
    }
    return { rowsDeleted: rows.length, hasMore: rows.length === batchSize }
  }

  if (table === 'workspaces') {
    let deleted = 0
    let blocked = false
    for (const workspaceId of workspaceIds.slice(0, batchSize)) {
      if (await hasAnyWorkspaceRows(admin, workspaceId)) {
        blocked = true
        continue
      }
      const { error } = await admin.from(table).delete().eq('id', workspaceId)
      if (error) throw new DeletionJobError(`${table}_delete_failed`)
      deleted += 1
    }
    return { rowsDeleted: deleted, hasMore: blocked || workspaceIds.length > batchSize }
  }

  const { data, error } = await admin
    .from(table)
    .select('id')
    .in('workspace_id', workspaceIds)
    .limit(batchSize)
  if (error) throw new DeletionJobError(`${table}_select_failed`)
  const ids = ((data ?? []) as unknown as Array<{ id: string | number }>).map((row) => row.id)
  if (ids.length === 0) return { rowsDeleted: 0, hasMore: false }

  const { error: deleteError } = await admin.from(table).delete().in('id', ids as never)
  if (deleteError) throw new DeletionJobError(`${table}_delete_failed`)
  return { rowsDeleted: ids.length, hasMore: ids.length === batchSize }
}

async function hasAnyWorkspaceRows(admin: AdminClient, workspaceId: string) {
  for (const table of WORKSPACE_DATA_TABLES) {
    const verificationColumn = table === 'quota_counters' || table === 'workspace_members' ? 'workspace_id' : 'id'
    const { data, error } = await admin
      .from(table)
      .select(verificationColumn)
      .eq('workspace_id', workspaceId)
      .limit(1)
    if (error) throw new DeletionJobError(`${table}_verification_failed`)
    if ((data ?? []).length > 0) return true
  }
  return false
}

async function updateJob(admin: AdminClient, job: AccountDeletionJob, lockToken: string, values: Record<string, unknown>) {
  const { error } = await admin
    .from('account_deletion_jobs')
    .update({
      ...values,
      status: 'queued',
      locked_at: null,
      lock_token: null,
      next_attempt_at: new Date().toISOString(),
      last_error: null,
    } as never)
    .eq('id', job.id)
    .eq('lock_token', lockToken)
  if (error) throw new DeletionJobError('job_checkpoint_failed')
}

async function markJobFailed(admin: AdminClient, jobId: string, lockToken: string, code: string) {
  await admin
    .from('account_deletion_jobs')
    .update({
      status: 'failed',
      locked_at: null,
      lock_token: null,
      next_attempt_at: new Date(Date.now() + ACCOUNT_DELETION_RETRY_DELAY_MS).toISOString(),
      last_error: code.slice(0, 120),
    } as never)
    .eq('id', jobId)
    .eq('lock_token', lockToken)
}
