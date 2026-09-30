import 'server-only'

import { cookies } from 'next/headers'

import { getViewerSessionCookieName, LEGACY_VIEWER_SESSION_COOKIE } from '../shares/exchange'
import { hashViewerSessionToken } from '../security/tokens'
import { isShareCode } from '../shares/share-code'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { Database } from '../supabase/database.types'
import { logViewerDiagnostic, summarizeViewerError } from '../viewer/diagnostics'

type AuthorizedSession = Pick<Database['public']['Tables']['viewer_sessions']['Row'],
  | 'id'
  | 'share_id'
  | 'workspace_id'
  | 'viewer_id'
  | 'analytics_mode'
  | 'gpc_applied'
  | 'last_seen_at'
  | 'confirmed_at'
  | 'active_ms'
  | 'security_signals'
  | 'entry_path'
  | 'browser'
  | 'os'
  | 'device_type'
  | 'country'
  | 'city'
  | 'region'
  | 'referrer_host'
  | 'is_probable_bot'
  | 'vpn_indication'
  | 'proxy_indication'
  | 'tor_indication'
  | 'datacenter_indication'
>
type AuthorizedShare = Pick<Database['public']['Tables']['shares']['Row'],
  | 'id'
  | 'workspace_id'
  | 'repository_id'
  | 'share_code'
  | 'share_type'
  | 'recipient_label'
  | 'ref'
  | 'expires_at'
  | 'notify_on_view'
  | 'allow_download'
  | 'rules'
>
type AuthorizedRepository = Pick<Database['public']['Tables']['repositories']['Row'],
  | 'id'
  | 'workspace_id'
  | 'github_installation_id'
  | 'github_repository_id'
  | 'github_owner'
  | 'github_repo'
  | 'enabled'
  | 'default_rules'
>

export class ViewerAuthorizationError extends Error {
  readonly code = 'viewer_unauthorized' as const

  constructor(
    public readonly reason: 'invalid' | 'expired' | 'revoked' | 'repository_unavailable' | 'unavailable' = 'invalid',
    cause?: unknown,
  ) {
    super(getViewerAuthorizationMessage(reason))
    this.name = 'ViewerAuthorizationError'
    if (cause !== undefined) this.cause = cause
  }
}

export async function requireViewerSession(shareId: string) {
  const cookieStore = await cookies()
  const rawSessionToken = cookieStore.get(getViewerSessionCookieName(shareId))?.value
    ?? cookieStore.get(LEGACY_VIEWER_SESSION_COOKIE)?.value
  logViewerDiagnostic('viewer-session-cookie', {
    shareIdentifierType: getShareIdentifierType(shareId),
    cookiePresent: Boolean(rawSessionToken),
  })
  return authorizeViewerSession(shareId, rawSessionToken)
}

export async function authorizeViewerSession(shareId: string, rawSessionToken: string | undefined) {
  const isShareUuid = isUuid(shareId)
  const isValidIdentifier = isShareUuid || isShareCode(shareId)
  if (!isValidIdentifier || !rawSessionToken) {
    logViewerDiagnostic('viewer-session-input-invalid', {
      shareIdentifierType: getShareIdentifierType(shareId),
      cookiePresent: Boolean(rawSessionToken),
    })
    throw new ViewerAuthorizationError('invalid')
  }

  const admin = createSupabaseAdminClient()
  const sessionTokenHash = hashViewerSessionToken(rawSessionToken)
  const { data, error } = await admin.rpc('authorize_viewer_session', {
    target_session_token_hash: sessionTokenHash,
    target_share_id: isShareUuid ? shareId : null,
    target_share_code: isShareUuid ? null : shareId,
  })

  logViewerDiagnostic('viewer-session-lookup', {
    shareIdentifierType: getShareIdentifierType(shareId),
    cookiePresent: true,
    sessionMatched: Boolean(data?.[0]),
    databaseError: Boolean(error),
    ...(error ? { error: summarizeViewerError(error).message } : {}),
  })

  if (error) {
    throw new ViewerAuthorizationError('unavailable', error)
  }
  const result = data?.[0]
  if (!result) {
    throw new ViewerAuthorizationError('invalid')
  }
  if (result.authorization_status === 'revoked') {
    logViewerDiagnostic('viewer-share-revoked', { shareIdentifierType: getShareIdentifierType(shareId) })
    throw new ViewerAuthorizationError('revoked')
  }
  if (result.authorization_status === 'expired') {
    logViewerDiagnostic('viewer-share-expired', { shareIdentifierType: getShareIdentifierType(shareId) })
    throw new ViewerAuthorizationError('expired')
  }
  if (result.authorization_status !== 'authorized') {
    logViewerDiagnostic('viewer-workspace-or-repository-unavailable', {
      shareIdentifierType: getShareIdentifierType(shareId),
      authorizationStatus: result.authorization_status,
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  const session = result.session as unknown as AuthorizedSession
  const share = result.share as unknown as AuthorizedShare
  const repository = result.repository as unknown as AuthorizedRepository

  if (!session?.id || session.share_id !== share.id || session.workspace_id !== share.workspace_id) {
    logViewerDiagnostic('viewer-session-relationship-invalid', {
      shareIdentifierType: getShareIdentifierType(shareId),
      sessionPresent: Boolean(session?.id),
      shareMatched: Boolean(session?.id && session.share_id === share.id),
    })
    throw new ViewerAuthorizationError('invalid')
  }

  if (
    !repository?.id
    || repository.id !== share.repository_id
    || repository.workspace_id !== share.workspace_id
    || !repository.enabled
    || !repository.github_repository_id
    || !Number.isSafeInteger(repository.github_repository_id)
    || repository.github_repository_id <= 0
    || typeof repository.github_owner !== 'string'
    || !repository.github_owner.trim()
    || typeof repository.github_repo !== 'string'
    || !repository.github_repo.trim()
  ) {
    logViewerDiagnostic('viewer-repository-validation-failed', {
      shareIdentifierType: getShareIdentifierType(shareId),
      repositoryPresent: Boolean(repository?.id),
      repositoryMatchesShare: Boolean(repository && repository.id === share.repository_id),
      repositoryMatchesWorkspace: Boolean(repository && repository.workspace_id === share.workspace_id),
      repositoryEnabled: repository?.enabled === true,
      repositoryIdentityPresent: Boolean(
        repository
        && repository.github_repository_id !== null
        && Number.isSafeInteger(repository.github_repository_id)
        && repository.github_repository_id > 0,
      ),
      repositoryLocationPresent: Boolean(
        repository
        && typeof repository.github_owner === 'string'
        && repository.github_owner.trim()
        && typeof repository.github_repo === 'string'
        && repository.github_repo.trim(),
      ),
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  if (!repository.github_installation_id) {
    logViewerDiagnostic('viewer-installation-reference-missing', {
      shareIdentifierType: getShareIdentifierType(shareId),
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  logViewerDiagnostic('viewer-installation-validation', {
    shareIdentifierType: getShareIdentifierType(shareId),
    installationPresent: true,
    installationActive: true,
  })
  logViewerDiagnostic('viewer-session-authorized', {
    shareIdentifierType: getShareIdentifierType(shareId),
    repositoryEnabled: repository.enabled,
    installationChecked: true,
  })

  return {
    session,
    share,
    repository,
    shareId: share.id,
    shareCode: share.share_code ?? share.id,
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getShareIdentifierType(value: string) {
  if (isUuid(value)) return 'uuid'
  if (isShareCode(value)) return 'share_code'
  return 'invalid'
}

function getViewerAuthorizationMessage(reason: ViewerAuthorizationError['reason']) {
  switch (reason) {
    case 'expired':
      return 'Viewer session refers to an expired share.'
    case 'revoked':
      return 'Viewer session refers to a revoked share.'
    case 'repository_unavailable':
      return 'The repository for this share is unavailable.'
    case 'unavailable':
      return 'Viewer authorization is temporarily unavailable.'
    case 'invalid':
      return 'Viewer session is not authorized.'
  }
}
