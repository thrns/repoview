import 'server-only'

import type { User } from '@supabase/supabase-js'

import { getAccountDeletionConfirmation } from './deletion-shared'
import { createSupabaseAdminClient } from '../supabase/admin'

export type AccountDeletionErrorCode =
  | 'confirmation_required'
  | 'recent_auth_required'
  | 'workspace_has_members'
  | 'cleanup_failed'

export class AccountDeletionError extends Error {
  constructor(public readonly code: AccountDeletionErrorCode) {
    super(getAccountDeletionErrorMessage(code))
    this.name = 'AccountDeletionError'
  }
}

/**
 * Queue account deletion after step-up authentication has been consumed.
 *
 * The database function performs the fail-closed transition and creates the
 * durable job in one transaction. The worker in deletion-job.ts performs all
 * destructive cleanup later in bounded, resumable steps.
 */
export async function deleteAccountData({ user, confirmation, stepUpConfirmed }: { user: User; confirmation: string; stepUpConfirmed: boolean }) {
  if (confirmation.trim() !== getAccountDeletionConfirmation(user.email)) {
    throw new AccountDeletionError('confirmation_required')
  }

  if (!stepUpConfirmed) {
    throw new AccountDeletionError('recent_auth_required')
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.rpc('request_account_deletion', {
    target_user_id: user.id,
  })

  if (error) {
    if (error.message?.includes('workspace_has_members')) {
      throw new AccountDeletionError('workspace_has_members')
    }
    throw new AccountDeletionError('cleanup_failed')
  }

  const job = Array.isArray(data) ? data[0] : data
  if (!job?.id) throw new AccountDeletionError('cleanup_failed')

  return {
    queued: true as const,
    jobId: job.id,
    status: job.status,
  }
}

function getAccountDeletionErrorMessage(code: AccountDeletionErrorCode) {
  switch (code) {
    case 'confirmation_required':
      return 'Type the confirmation phrase exactly as shown.'
    case 'recent_auth_required':
      return 'Sign in again before deleting your account.'
    case 'workspace_has_members':
      return 'Remove or transfer other workspace members before deleting this account.'
    case 'cleanup_failed':
      return 'Account cleanup could not be queued. Public shares remain disabled while you retry.'
  }
}
