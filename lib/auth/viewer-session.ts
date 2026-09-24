import 'server-only'

import { cookies } from 'next/headers'

import { VIEWER_SESSION_COOKIE } from '../shares/exchange'
import { hashViewerSessionToken } from '../security/tokens'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { Database } from '../supabase/database.types'

type JoinedViewerShare = Database['public']['Tables']['shares']['Row'] & {
  repository: Database['public']['Tables']['repositories']['Row']
  viewer_sessions: Database['public']['Tables']['viewer_sessions']['Row'][]
}

export class ViewerAuthorizationError extends Error {
  readonly code = 'viewer_unauthorized' as const

  constructor() {
    super('Viewer session is not authorized.')
    this.name = 'ViewerAuthorizationError'
  }
}

export async function requireViewerSession(shareId: string) {
  const cookieStore = await cookies()
  return authorizeViewerSession(shareId, cookieStore.get(VIEWER_SESSION_COOKIE)?.value)
}

export async function authorizeViewerSession(shareId: string, rawSessionToken: string | undefined) {
  if ((!isUuid(shareId) && !isShareCode(shareId)) || !rawSessionToken) {
    throw new ViewerAuthorizationError()
  }

  const admin = createSupabaseAdminClient()
  const shareFilter = isUuid(shareId) ? 'id' : 'share_code'
  const { data: joinedShare, error } = await admin
    .from('shares')
    .select('*, repository:repositories!inner(*), viewer_sessions!inner(*)')
    .eq(shareFilter, shareId)
    .eq('viewer_sessions.session_token_hash', hashViewerSessionToken(rawSessionToken))
    .maybeSingle()

  if (error || !joinedShare) {
    throw new ViewerAuthorizationError()
  }

  const { repository, viewer_sessions: sessions, ...share } = joinedShare as unknown as JoinedViewerShare
  const session = sessions[0]

  if (!session || session.share_id !== share.id || share.revoked_at || (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) || !repository || !repository.enabled) {
    throw new ViewerAuthorizationError()
  }

  if (repository.github_installation_id) {
    const { data: installation, error: installationError } = await admin
      .from('github_installations')
      .select('status')
      .eq('id', repository.github_installation_id)
      .eq('workspace_id', share.workspace_id)
      .maybeSingle()

    if (installationError || !installation || installation.status !== 'active') {
      throw new ViewerAuthorizationError()
    }
  }

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
