import { type NextRequest, NextResponse } from 'next/server'

import { createContentSecurityPolicy } from './lib/security/csp'
import { ShareExchangeError, exchangeShareToken, getViewerSessionCookieName, LEGACY_VIEWER_SESSION_COOKIE } from './lib/shares/exchange'
import { clearShareRedirectCookie, clearViewerSessionCookie, getShareExchangeRequestContext, SHARE_REDIRECT_COOKIE, setViewerSessionCookies, setViewerSessionRequestCookie } from './lib/shares/request'
import { isNewShareCode } from './lib/shares/share-code'
import { checkPublicRateLimit, getPublicShareRateLimitKey, rateLimitResponse, rateLimitUnavailableResponse } from './lib/security/rate-limit'
import { updateSupabaseSession } from './lib/supabase/proxy'
import { logViewerDiagnostic, summarizeViewerError } from './lib/viewer/diagnostics'

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const contentSecurityPolicy = createContentSecurityPolicy({ nonce, isDevelopment: process.env.NODE_ENV === 'development' })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const directShareCode = getDirectShareCode(request.nextUrl.pathname)
  if (directShareCode) {
    const response = await openDirectShare(request, directShareCode, requestHeaders)
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
    return response
  }

  const shouldRefreshSession = /^(?:\/dashboard|\/onboarding|\/system-admin|\/login)(?:\/|$)/.test(request.nextUrl.pathname)
  const hasSupabaseConfiguration = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const response = shouldRefreshSession && hasSupabaseConfiguration
    ? await updateSupabaseSession(request, { requestHeaders })
    : NextResponse.next({ request: { headers: requestHeaders } })

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

async function openDirectShare(request: NextRequest, shareCode: string, requestHeaders: Headers) {
  try {
    const decision = await checkPublicRateLimit(request, 'public-share-open', [getPublicShareRateLimitKey(shareCode)])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  try {
    const redirectedShareCode = request.cookies.get(SHARE_REDIRECT_COOKIE)?.value
    const scopedSessionCookie = request.cookies.get(getViewerSessionCookieName(shareCode))?.value
    const legacySessionCookie = request.cookies.get(LEGACY_VIEWER_SESSION_COOKIE)?.value
    if (redirectedShareCode === shareCode && (scopedSessionCookie || legacySessionCookie)) {
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      clearShareRedirectCookie(response, request.url)
      logViewerDiagnostic('direct-share-redirect-session-reused', {
        shareCode,
        sessionCreated: false,
        reason: 'legacy-share-redirect',
      })
      return response
    }

    const exchangeContext = await getShareExchangeRequestContext(request)
    if (exchangeContext.metadata.isPrefetch) {
      logViewerDiagnostic('viewer-visit-skipped-prefetch', {
        shareCode,
        sessionCreated: false,
        reason: 'prefetch',
      })
      return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }
    const result = await exchangeShareToken(shareCode, exchangeContext.metadata, exchangeContext.rawViewerId, exchangeContext.privacy)
    setViewerSessionRequestCookie(requestHeaders, result)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    setViewerSessionCookies(response, request.url, result)
    logViewerDiagnostic('direct-share-session-cookie-set', {
      shareCode,
      sessionCreated: true,
      cookiePath: '/',
      cookieSecure: new URL(request.url).protocol === 'https:',
    })
    return response
  } catch (error) {
    logViewerDiagnostic('direct-share-open-failed', {
      shareCode,
      error: summarizeViewerError(error).message,
      ...(error instanceof ShareExchangeError ? { exchangeErrorCode: error.code } : {}),
    })
    const reason = error instanceof ShareExchangeError && error.code !== 'upstream' ? error.code : 'unavailable'
    const response = NextResponse.redirect(new URL(`/view/error?reason=${reason}`, request.url), { status: 303 })
    clearViewerSessionCookie(response, request.url, shareCode)
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    return response
  }
}

function getDirectShareCode(pathname: string) {
  const match = /^\/view\/([^/]+)$/.exec(pathname)
  return match && isNewShareCode(match[1]) ? match[1] : null
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
        { type: 'header', key: 'x-purpose', value: 'prefetch' },
        { type: 'header', key: 'sec-purpose', value: 'prefetch' },
      ],
    },
  ],
}
