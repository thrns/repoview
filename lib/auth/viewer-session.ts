import 'server-only'

import { cookies } from 'next/headers'

import { VIEWER_SESSION_COOKIE } from '../shares/exchange'
import { hashViewerSessionToken } from '../security/tokens'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { Database } from '../supabase/database.types'
import { logViewerDiagnostic, summarizeViewerError } from '../viewer/diagnostics'

type JoinedViewerShare = Database['public']['Tables']['shares']['Row'] & {
  repository: Database['public']['Tables']['repositories']['Row']
  viewer_sessions: Database['public']['Tables']['viewer_sessions']['Row'][]
}

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
  const rawSessionToken = cookieStore.get(VIEWER_SESSION_COOKIE)?.value
  logViewerDiagnostic('viewer-session-cookie', {
    shareIdentifierType: getShareIdentifierType(shareId),
    cookiePresent: Boolean(rawSessionToken),
  })
  return authorizeViewerSession(shareId, rawSessionToken)
}

export async function authorizeViewerSession(shareId: string, rawSessionToken: string | undefined) {
  if ((!isUuid(shareId) && !isShareCode(shareId)) || !rawSessionToken) {
    logViewerDiagnostic('viewer-session-input-invalid', {
      shareIdentifierType: getShareIdentifierType(shareId),
      cookiePresent: Boolean(rawSessionToken),
    })
    throw new ViewerAuthorizationError('invalid')
  }

  const admin = createSupabaseAdminClient()
  const shareFilter = isUuid(shareId) ? 'id' : 'share_code'
  const { data: joinedShare, error } = await admin
    .from('shares')
    // Workspace tenancy adds composite foreign keys alongside the original
    // single-column relationships. Name the intended relationships explicitly
    // so PostgREST does not reject this embed as ambiguous.
    .select('*, repository:repositories!shares_workspace_repository_fk!inner(*), viewer_sessions:viewer_sessions!viewer_sessions_workspace_share_fk!inner(*)')
    .eq(shareFilter, shareId)
    .eq('viewer_sessions.session_token_hash', hashViewerSessionToken(rawSessionToken))
    .maybeSingle()

  logViewerDiagnostic('viewer-session-lookup', {
    shareIdentifierType: getShareIdentifierType(shareId),
    shareFilter,
    cookiePresent: true,
    sessionMatched: Boolean(joinedShare),
    databaseError: Boolean(error),
    ...(error ? { error: summarizeViewerError(error).message } : {}),
  })

  if (error) {
    throw new ViewerAuthorizationError('unavailable', error)
  }
  if (!joinedShare) {
    throw new ViewerAuthorizationError('invalid')
  }

  const { repository, viewer_sessions: sessions, ...share } = joinedShare as unknown as JoinedViewerShare
  const session = sessions[0]

  const { data: workspace, error: workspaceError } = await admin
    .from('workspaces')
    .select('status')
    .eq('id', share.workspace_id)
    .maybeSingle()

  if (!session || session.share_id !== share.id) {
    logViewerDiagnostic('viewer-session-relationship-invalid', {
      shareIdentifierType: getShareIdentifierType(shareId),
      sessionPresent: Boolean(session),
      shareMatched: Boolean(session && session.share_id === share.id),
    })
    throw new ViewerAuthorizationError('invalid')
  }

  if (share.revoked_at) {
    logViewerDiagnostic('viewer-share-revoked', { shareIdentifierType: getShareIdentifierType(shareId) })
    throw new ViewerAuthorizationError('revoked')
  }

  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    logViewerDiagnostic('viewer-share-expired', { shareIdentifierType: getShareIdentifierType(shareId) })
    throw new ViewerAuthorizationError('expired')
  }

  if (workspaceError) {
    logViewerDiagnostic('viewer-workspace-lookup-failed', {
      shareIdentifierType: getShareIdentifierType(shareId),
      databaseError: true,
      error: summarizeViewerError(workspaceError).message,
    })
    throw new ViewerAuthorizationError('unavailable', workspaceError)
  }

  if (!workspace || workspace.status !== 'active') {
    logViewerDiagnostic('viewer-workspace-unavailable', {
      shareIdentifierType: getShareIdentifierType(shareId),
      workspacePresent: Boolean(workspace),
      workspaceStatus: workspace?.status,
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  if (
    !repository
    || repository.id !== share.repository_id
    || repository.workspace_id !== share.workspace_id
    || !repository.enabled
  ) {
    logViewerDiagnostic('viewer-repository-validation-failed', {
      shareIdentifierType: getShareIdentifierType(shareId),
      repositoryPresent: Boolean(repository),
      repositoryMatchesShare: Boolean(repository && repository.id === share.repository_id),
      repositoryMatchesWorkspace: Boolean(repository && repository.workspace_id === share.workspace_id),
      repositoryEnabled: repository?.enabled === true,
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  if (!repository.github_installation_id) {
    logViewerDiagnostic('viewer-installation-reference-missing', {
      shareIdentifierType: getShareIdentifierType(shareId),
    })
    throw new ViewerAuthorizationError('repository_unavailable')
  }

  const { data: installation, error: installationError } = await admin
    .from('github_installations')
    .select('status')
    .eq('id', repository.github_installation_id)
    .eq('workspace_id', share.workspace_id)
    .maybeSingle()

  logViewerDiagnostic('viewer-installation-validation', {
    shareIdentifierType: getShareIdentifierType(shareId),
    installationPresent: Boolean(installation),
    installationActive: installation?.status === 'active',
    databaseError: Boolean(installationError),
    ...(installationError ? { error: summarizeViewerError(installationError).message } : {}),
  })

  if (installationError) {
    throw new ViewerAuthorizationError('unavailable', installationError)
  }
  if (!installation || installation.status !== 'active') {
    throw new ViewerAuthorizationError('repository_unavailable')
  }

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

function isShareCode(value: string) {
  return /^[A-Za-z0-9_-]{8}$/.test(value)
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
