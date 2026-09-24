import 'server-only'

import type { User } from '@supabase/supabase-js'

import { getAccountDeletionConfirmation } from './deletion-shared'
import { createSupabaseAdminClient } from '../supabase/admin'

export const RECENT_AUTH_MAX_AGE_MS = 15 * 60 * 1000

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

export function isRecentlyAuthenticated(user: { last_sign_in_at?: string | null }, now = Date.now()) {
  if (!user.last_sign_in_at) return false
  const age = now - new Date(user.last_sign_in_at).getTime()
  return age >= 0 && age <= RECENT_AUTH_MAX_AGE_MS
}

export async function deleteAccountData({ user, confirmation }: { user: User; confirmation: string }) {
  if (confirmation.trim() !== getAccountDeletionConfirmation(user.email)) {
    throw new AccountDeletionError('confirmation_required')
  }

  if (!isRecentlyAuthenticated(user)) {
    throw new AccountDeletionError('recent_auth_required')
  }

  const admin = createSupabaseAdminClient()
  const { data: ownedWorkspaces, error: workspaceLookupError } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)

  if (workspaceLookupError) throw new AccountDeletionError('cleanup_failed')

  const workspaceIds = (ownedWorkspaces ?? []).map((workspace) => workspace.id)
  if (workspaceIds.length > 0) {
    const { data: otherMembers, error: memberLookupError } = await admin
      .from('workspace_members')
      .select('workspace_id, user_id')
      .in('workspace_id', workspaceIds)
      .neq('user_id', user.id)

    if (memberLookupError) throw new AccountDeletionError('cleanup_failed')
    if ((otherMembers ?? []).length > 0) throw new AccountDeletionError('workspace_has_members')
  }

  const now = new Date().toISOString()

  // This is intentionally the first mutation. Every public share check reads
  // workspace status before returning a session or repository content.
  if (workspaceIds.length > 0) {
    await expectSuccess(
      admin.from('workspaces').update({ status: 'deleting', deletion_started_at: now }).in('id', workspaceIds),
    )

    await expectSuccess(
      admin.from('shares').update({ revoked_at: now }).in('workspace_id', workspaceIds).is('revoked_at', null),
    )
    await expectSuccess(
      admin.from('notification_settings').update({
        destination_email: null,
        email_verified: false,
        view_opened: false,
        returning_view: false,
        download: false,
        session_summary: false,
        security_alerts: false,
        digest_frequency: 'off',
      }).in('workspace_id', workspaceIds),
    )
    await expectSuccess(
      admin.from('github_installations').update({ status: 'deleted', suspended_at: null }).in('workspace_id', workspaceIds),
    )
    await expectSuccess(
      admin.from('repositories').update({ enabled: false }).in('workspace_id', workspaceIds),
    )

    // Delete user-owned metadata and analytics explicitly. The workspace
    // cascade remains a final safety net for any future tenant-owned table.
    for (const table of [
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
      'github_installations',
      'notification_settings',
      'audit_logs',
      'quota_counters',
      'github_connection_transactions',
    ] as const) {
      await expectSuccess(admin.from(table).delete().in('workspace_id', workspaceIds))
    }

    // Remove owner memberships while the lifecycle trigger can still verify
    // that the workspace is in deleting state. This keeps the final workspace
    // delete independent of cascade-trigger ordering.
    await expectSuccess(admin.from('workspace_members').delete().in('workspace_id', workspaceIds))
    await expectSuccess(admin.from('workspaces').delete().in('id', workspaceIds))
  }

  // Remove memberships in workspaces owned by someone else without touching
  // their tenant data. Owner memberships were removed before owned workspaces.
  await expectSuccess(admin.from('workspace_members').delete().eq('user_id', user.id))

  const { error: authDeletionError } = await admin.auth.admin.deleteUser(user.id)
  if (authDeletionError) throw new AccountDeletionError('cleanup_failed')

  return { deleted: true as const }
}

async function expectSuccess(result: PromiseLike<{ error: { message?: string } | null }>) {
  const { error } = await result
  if (error) throw new AccountDeletionError('cleanup_failed')
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
      return 'Account cleanup could not finish. Public shares remain disabled while you retry.'
  }
}
