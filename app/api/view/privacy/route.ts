import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireViewerSession } from '../../../../lib/auth/viewer-session'
import { VIEWER_ID_COOKIE } from '../../../../lib/analytics/constants'
import { findOrCreateViewer } from '../../../../lib/analytics/identity'
import { saveViewerPrivacyPreference } from '../../../../lib/viewer/privacy'
import { isGlobalPrivacyControl, isViewerAnalyticsMode, VIEWER_PRIVACY_PREFERENCE_COOKIE as PRIVACY_COOKIE, VIEWER_PRIVACY_PREFERENCE_MAX_AGE as PRIVACY_COOKIE_MAX_AGE, type ViewerAnalyticsMode } from '../../../../lib/viewer/privacy-shared'
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin'
import { checkPublicRateLimit, checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'

const requestSchema = z.object({
  shareId: z.string().uuid().or(z.string().regex(/^[A-Za-z0-9_-]{8}$/)),
  analyticsMode: z.string().refine(isViewerAnalyticsMode),
})

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const decision = await checkPublicRateLimit(request, 'public-viewer-privacy')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try {
    const shareId = new URL(request.url).searchParams.get('shareId')
    if (!shareId) throw new Error('missing_share')
    viewer = await requireViewerSession(shareId)
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }

  const gpc = isGlobalPrivacyControl(request.headers.get('sec-gpc'))
  const analyticsMode: ViewerAnalyticsMode = gpc ? 'necessary' : viewer.session.analytics_mode === 'optional' ? 'optional' : 'necessary'
  return json({ analyticsMode, gpc, optionalAvailable: !gpc })
}

export async function POST(request: Request) {
  let input: z.infer<typeof requestSchema>
  try {
    input = requestSchema.parse(await request.json())
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  try {
    const decision = await checkPublicRateLimit(request, 'public-viewer-privacy')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try {
    viewer = await requireViewerSession(input.shareId)
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }

  try {
    const decision = await checkRateLimits('public-viewer-privacy', [
      { value: `session:${viewer.session.id}` },
    ])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  const requestGpc = isGlobalPrivacyControl(request.headers.get('sec-gpc'))
  const requestedMode = input.analyticsMode as ViewerAnalyticsMode
  const analyticsMode: ViewerAnalyticsMode = requestedMode === 'optional' && !requestGpc ? 'optional' : 'necessary'
  const gpc = requestGpc || viewer.session.gpc_applied === true && requestedMode !== 'optional'
  const cookieStore = await cookies()
  const rawPreferenceToken = cookieStore.get(PRIVACY_COOKIE)?.value
  const rawViewerId = cookieStore.get(VIEWER_ID_COOKIE)?.value
  const admin = createSupabaseAdminClient()

  let preferenceToken: string | undefined
  if (requestedMode === 'necessary' || analyticsMode === 'optional') {
    try {
      const preference = await saveViewerPrivacyPreference({
        rawPreferenceToken,
        analyticsMode,
        gpcApplied: gpc,
      })
      preferenceToken = preference.rawToken
    } catch {
      return json({ error: 'unavailable' }, 500)
    }
  }

  let viewerId: string | null = null
  let resolvedViewerToken: string | undefined
  if (analyticsMode === 'optional') {
    try {
      const identity = await findOrCreateViewer(rawViewerId, viewer.share.workspace_id)
      viewerId = identity.viewer.id
      resolvedViewerToken = identity.rawViewerId
    } catch {
      return json({ error: 'unavailable' }, 500)
    }
  }

  const { error } = await admin
    .from('viewer_sessions')
    .update({
      analytics_mode: analyticsMode,
      gpc_applied: gpc,
      viewer_id: viewerId,
    })
    .eq('id', viewer.session.id)
    .eq('share_id', viewer.share.id)
    .eq('workspace_id', viewer.share.workspace_id)

  if (error) return json({ error: 'unavailable' }, 500)

  const response = json({ analyticsMode, gpc, optionalAvailable: !requestGpc }, 200)
  if (preferenceToken) {
    response.cookies.set({
      name: PRIVACY_COOKIE,
      value: preferenceToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PRIVACY_COOKIE_MAX_AGE,
    })
  }
  if (resolvedViewerToken) {
    response.cookies.set({
      name: VIEWER_ID_COOKIE,
      value: resolvedViewerToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 730,
    })
  } else {
    response.cookies.set({
      name: VIEWER_ID_COOKIE,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }
  return response
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie' } })
}
