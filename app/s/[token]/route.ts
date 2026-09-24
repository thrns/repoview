import { type NextRequest, NextResponse } from 'next/server'

import { getLinkOpenMetadata } from '@/lib/shares/link-open-metadata'
import { exchangeShareToken, ShareExchangeError, VIEWER_SESSION_COOKIE } from '@/lib/shares/exchange'
import { VIEWER_ID_COOKIE } from '../../../lib/analytics/constants'
import { checkPublicRateLimit, getPublicShareRateLimitKey, rateLimitResponse, rateLimitUnavailableResponse } from '../../../lib/security/rate-limit'
import {
  findViewerPrivacyPreference,
} from '../../../lib/viewer/privacy'
import { isGlobalPrivacyControl, VIEWER_PRIVACY_PREFERENCE_COOKIE, type ViewerAnalyticsMode } from '../../../lib/viewer/privacy-shared'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params

  try {
    const decision = await checkPublicRateLimit(request, 'public-share-open', [getPublicShareRateLimitKey(token)])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  try {
    const rawPreferenceToken = request.cookies?.get(VIEWER_PRIVACY_PREFERENCE_COOKIE)?.value
    let preference: Awaited<ReturnType<typeof findViewerPrivacyPreference>> = null
    if (rawPreferenceToken) {
      try {
        preference = await findViewerPrivacyPreference(rawPreferenceToken)
      } catch {
        preference = null
      }
    }
    const gpc = isGlobalPrivacyControl(request.headers.get('sec-gpc'))
    const analyticsMode: ViewerAnalyticsMode = !gpc && preference?.analytics_mode === 'optional' ? 'optional' : 'necessary'
    const rawViewerId = analyticsMode === 'optional' ? request.cookies?.get(VIEWER_ID_COOKIE)?.value : undefined
    const result = await exchangeShareToken(
      token,
      getLinkOpenMetadata(request),
      analyticsMode === 'optional' && isViewerIdentity(rawViewerId) ? rawViewerId : undefined,
      { analyticsMode, gpc },
    )
    const redirectUrl = new URL(`/view/${result.shareCode}`, request.url)
    const response = NextResponse.redirect(redirectUrl, { status: 303 })
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.cookies.set({
      name: VIEWER_SESSION_COOKIE,
      value: result.rawSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      // The viewer also authenticates API and asset requests outside /view.
      path: '/',
      ...(result.expiresAt ? { expires: new Date(result.expiresAt) } : {}),
    })
    if (result.rawViewerId) {
      response.cookies.set({
        name: VIEWER_ID_COOKIE,
        value: result.rawViewerId,
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
  } catch (error) {
    const reason = error instanceof ShareExchangeError && error.code !== 'upstream' ? error.code : 'unavailable'
    const response = NextResponse.redirect(new URL(`/view/error?reason=${reason}`, request.url), { status: 303 })
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return response
  }
}

function isViewerIdentity(value: string | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{20,128}$/.test(value))
}
