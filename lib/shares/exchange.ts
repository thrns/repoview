import 'server-only'

import {
  sanitizeLinkOpenMetadata,
  toLinkOpenEventMetadata,
  type LinkOpenMetadata,
} from './link-open-metadata'
import { generateViewerSessionToken, hashNetworkValue, hashShareToken, hashViewerSessionToken } from '../security/tokens'
import { findOrCreateViewer } from '../analytics/identity'
import { createSupabaseAdminClient } from '../supabase/admin'
import type { ViewerAnalyticsMode } from '../viewer/privacy'

export const VIEWER_SESSION_COOKIE = 'repoview_viewer_session'

export type ShareExchangeErrorCode = 'invalid' | 'expired' | 'revoked' | 'repository_unavailable' | 'upstream'

export class ShareExchangeError extends Error {
  constructor(public readonly code: ShareExchangeErrorCode) {
    super(getExchangeErrorMessage(code))
    this.name = 'ShareExchangeError'
  }
}

export async function exchangeShareToken(
  rawToken: string,
  requestMetadata?: Partial<LinkOpenMetadata>,
  rawViewerId?: string,
  privacy?: { analyticsMode?: ViewerAnalyticsMode; gpc?: boolean },
) {
  const normalizedToken = rawToken.trim()
  if (!normalizedToken || normalizedToken.length > 512) {
    throw new ShareExchangeError('invalid')
  }

  const admin = createSupabaseAdminClient()
  const { data: share, error: shareError } = await admin
    .from('shares')
    .select('*')
    .eq('token_hash', hashShareToken(normalizedToken))
    .maybeSingle()

  if (shareError) {
    throw new ShareExchangeError('upstream')
  }
  if (!share) {
    void recordInvalidAttempt(admin, hashShareToken(normalizedToken), 'invalid', sanitizeLinkOpenMetadata(requestMetadata))
    throw new ShareExchangeError('invalid')
  }
  if (share.revoked_at) {
    void recordInvalidAttempt(admin, hashShareToken(normalizedToken), 'revoked', sanitizeLinkOpenMetadata(requestMetadata), share.id, share.workspace_id)
    throw new ShareExchangeError('revoked')
  }
  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    void recordInvalidAttempt(admin, hashShareToken(normalizedToken), 'expired', sanitizeLinkOpenMetadata(requestMetadata), share.id, share.workspace_id)
    throw new ShareExchangeError('expired')
  }
  if (!share.ref.trim()) {
    throw new ShareExchangeError('invalid')
  }

  const { data: repository, error: repositoryError } = await admin
    .from('repositories')
    .select('*')
    .eq('id', share.repository_id)
    .eq('workspace_id', share.workspace_id)
    .maybeSingle()

  if (repositoryError || !repository || !repository.enabled) {
    throw new ShareExchangeError('repository_unavailable')
  }

  if (repository.github_installation_id) {
    const { data: installation, error: installationError } = await admin
      .from('github_installations')
      .select('status')
      .eq('id', repository.github_installation_id)
      .eq('workspace_id', share.workspace_id)
      .maybeSingle()

    if (installationError || !installation || installation.status !== 'active') {
      throw new ShareExchangeError('repository_unavailable')
    }
  }

  const metadata = sanitizeLinkOpenMetadata(requestMetadata)
  const gpcApplied = privacy?.gpc === true
  const analyticsMode: ViewerAnalyticsMode = gpcApplied ? 'necessary' : privacy?.analyticsMode === 'optional' ? 'optional' : 'necessary'
  const collectOptionalAnalytics = analyticsMode === 'optional'
  let viewer: Awaited<ReturnType<typeof findOrCreateViewer>>['viewer'] | null = null
  let resolvedViewerId: string | undefined
  if (collectOptionalAnalytics) {
    try {
      const identity = await findOrCreateViewer(rawViewerId, share.workspace_id)
      viewer = identity.viewer
      resolvedViewerId = identity.rawViewerId
    } catch {
      // Analytics must never block a valid repository view. The session remains
      // useful even if the optional anonymous identity write is unavailable.
    }
  }

  const tokenAgeSeconds = (share.created_at ?? share.updated_at) ? Math.max(0, Math.floor((Date.now() - new Date(share.created_at ?? share.updated_at).getTime()) / 1000)) : null
  const ipHash = metadata.publicIp ? hashNetworkValue(`${share.workspace_id}:${metadata.publicIp}`) : null
  let previousVisitCount = 0
  if (collectOptionalAnalytics && viewer) {
    try {
      const { data: previousSessions } = await admin
        .from('viewer_sessions')
        .select('id')
        .eq('share_id', share.id)
        .eq('workspace_id', share.workspace_id)
        .eq('viewer_id', viewer.id)
        .not('confirmed_at', 'is', null)
      previousVisitCount = previousSessions?.length ?? 0
    } catch {
      // Visit classification is useful telemetry, but never blocks the share.
    }
  }
  const rawSessionToken = generateViewerSessionToken()
  const sessionInsert = {
    workspace_id: share.workspace_id,
    share_id: share.id,
    session_token_hash: hashViewerSessionToken(rawSessionToken),
    analytics_mode: analyticsMode,
    gpc_applied: gpcApplied,
    ip_hash: ipHash,
    is_probable_bot: metadata.isProbableBot,
    vpn_indication: metadata.vpnIndication,
    proxy_indication: metadata.proxyIndication,
    tor_indication: metadata.torIndication,
    datacenter_indication: metadata.datacenterIndication,
    security_signals: {
      token_valid: true,
      vpn: metadata.vpnIndication,
      proxy: metadata.proxyIndication,
      tor: metadata.torIndication,
      datacenter: metadata.datacenterIndication,
      automation: metadata.isProbableBot,
    },
    ...(collectOptionalAnalytics ? {
      viewer_id: viewer?.id ?? null,
      referrer_host: metadata.referrerHost,
      browser: metadata.browser,
      os: metadata.os,
      device_type: metadata.deviceType,
      country: metadata.country,
      region: metadata.region,
      city: metadata.city,
      is_returning_visit: previousVisitCount > 0,
      previous_visit_count: previousVisitCount,
    } : {}),
  }
  const { data: session, error: sessionError } = await admin
    .from('viewer_sessions')
    .insert(sessionInsert)
    .select('id')
    .single()

  if (sessionError || !session) {
    throw new ShareExchangeError('upstream')
  }

  // Link opening is optional engagement analytics. Necessary-only mode still
  // records the security/access attempt below, but not an owner-facing event.
  if (collectOptionalAnalytics) {
    try {
      void Promise.resolve(admin.from('view_events').insert({
        workspace_id: share.workspace_id,
        share_id: share.id,
        session_id: session.id,
        event_type: 'link_opened',
        path: null,
        metadata: toLinkOpenEventMetadata(metadata, true),
      })).catch(() => undefined)
    } catch {
      // Best effort by design.
    }
  }

  const accessAttempt = {
    workspace_id: share.workspace_id,
    share_id: share.id,
    token_hash: hashShareToken(normalizedToken),
    valid: true,
    token_age_seconds: tokenAgeSeconds,
    ip_hash: ipHash,
    is_probable_bot: metadata.isProbableBot,
  }
  void Promise.resolve(admin.from('share_access_attempts').insert(accessAttempt)).then(() => undefined).catch(() => undefined)

  void annotateSessionSecurity({ admin, workspaceId: share.workspace_id, shareId: share.id, sessionId: session.id, viewerId: viewer?.id ?? null, ipHash }).catch(() => undefined)

  return {
    shareId: share.id,
    shareCode: share.share_code ?? share.id,
    rawSessionToken,
    ...(resolvedViewerId ? { rawViewerId: resolvedViewerId } : {}),
    ...(viewer ? { viewerCode: viewer.viewer_code } : {}),
    expiresAt: share.expires_at,
  }
}

async function annotateSessionSecurity({ admin, workspaceId, shareId, sessionId, viewerId, ipHash }: { admin: ReturnType<typeof createSupabaseAdminClient>; workspaceId: string; shareId: string; sessionId: string; viewerId: string | null; ipHash: string | null }) {
  const { data: previousSessions } = await admin.from('viewer_sessions').select('id, viewer_id, ip_hash, last_seen_at').eq('share_id', shareId).eq('workspace_id', workspaceId).neq('id', sessionId).order('last_seen_at', { ascending: false }).limit(25)
  const sessions = previousSessions ?? []
  const otherViewer = Boolean(viewerId && sessions.some((session) => session.viewer_id && session.viewer_id !== viewerId))
  const newNetwork = Boolean(ipHash && sessions.some((session) => session.ip_hash && session.ip_hash !== ipHash))
  const concurrent = sessions.filter((session) => Date.now() - new Date(session.last_seen_at).getTime() < 5 * 60_000).length + 1
  const signals = {
    token_valid: true,
    ...(otherViewer ? { possible_link_forwarding: true } : {}),
    ...(newNetwork ? { new_network: true } : {}),
    ...(concurrent > 1 ? { concurrent_sessions: concurrent } : {}),
  }
  if (Object.keys(signals).length === 0) return
  await admin.from('viewer_sessions').update({ security_signals: signals }).eq('id', sessionId).eq('share_id', shareId).eq('workspace_id', workspaceId)
}

async function recordInvalidAttempt(admin: ReturnType<typeof createSupabaseAdminClient>, tokenHash: string, reason: string, metadata: LinkOpenMetadata, shareId?: string, workspaceId?: string) {
  try {
    await admin.from('share_access_attempts').insert({
      workspace_id: workspaceId ?? null,
      token_hash: tokenHash,
      valid: false,
      failure_reason: reason,
      share_id: shareId ?? null,
      ip_hash: metadata.publicIp ? hashNetworkValue(`${workspaceId ?? 'unknown'}:${metadata.publicIp}`) : null,
      referrer_host: metadata.referrerHost,
      is_probable_bot: metadata.isProbableBot,
    })
  } catch {
    // Security telemetry is best effort and must not alter the error shown to a viewer.
  }
}

function getExchangeErrorMessage(code: ShareExchangeErrorCode) {
  switch (code) {
    case 'invalid':
      return 'This share link is invalid.'
    case 'expired':
      return 'This share link has expired.'
    case 'revoked':
      return 'This share link has been revoked.'
    case 'repository_unavailable':
      return 'This repository is no longer available.'
    case 'upstream':
      return 'This share is temporarily unavailable.'
  }
}
