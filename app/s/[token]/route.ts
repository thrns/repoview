import { type NextRequest, NextResponse } from 'next/server'

import { exchangeShareToken, ShareExchangeError } from '@/lib/shares/exchange'
import { getShareExchangeRequestContext, setShareRedirectCookie, setViewerSessionCookies } from '../../../lib/shares/request'
import { logViewerDiagnostic, summarizeViewerError } from '../../../lib/viewer/diagnostics'
import { checkPublicRateLimit, getPublicShareRateLimitKey, rateLimitResponse, rateLimitUnavailableResponse } from '../../../lib/security/rate-limit'

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
    const exchangeContext = await getShareExchangeRequestContext(request)
    const result = await exchangeShareToken(token, exchangeContext.metadata, exchangeContext.rawViewerId, exchangeContext.privacy)
    const redirectUrl = new URL(`/view/${result.shareCode}`, request.url)
    const response = NextResponse.redirect(redirectUrl, { status: 303 })
    setViewerSessionCookies(response, request.url, result)
    setShareRedirectCookie(response, request.url, result.shareCode)
    logViewerDiagnostic('share-exchange-session-cookie-set', {
      shareCode: result.shareCode,
      sessionCreated: true,
      cookiePath: '/',
      cookieSecure: new URL(request.url).protocol === 'https:',
    })
    return response
  } catch (error) {
    logViewerDiagnostic('share-exchange-failed', {
      error: summarizeViewerError(error).message,
      ...(error instanceof ShareExchangeError ? { exchangeErrorCode: error.code } : {}),
    })
    const reason = error instanceof ShareExchangeError && error.code !== 'upstream' ? error.code : 'unavailable'
    const response = NextResponse.redirect(new URL(`/view/error?reason=${reason}`, request.url), { status: 303 })
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return response
  }
}
