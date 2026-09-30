import 'server-only'

import type { NextResponse } from 'next/server'

import { VIEWER_ID_COOKIE } from '../analytics/constants'
import { isViewerIdentity } from '../analytics/identity'
import { exchangeShareToken, getViewerSessionCookieName } from './exchange'
import { getLinkOpenMetadata } from './link-open-metadata'
import { findViewerPrivacyPreference } from '../viewer/privacy'
import { isGlobalPrivacyControl, VIEWER_PRIVACY_PREFERENCE_COOKIE, type ViewerAnalyticsMode } from '../viewer/privacy-shared'

export const SHARE_REDIRECT_COOKIE = 'repoview_share_redirect'

type ShareOpenRequest = Pick<Request, 'headers' | 'url'> & {
  cookies?: { get(name: string): { value: string } | undefined }
}

export async function getShareExchangeRequestContext(request: ShareOpenRequest) {
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

  return {
    metadata: getLinkOpenMetadata(request),
    rawViewerId: analyticsMode === 'optional' && isViewerIdentity(rawViewerId) ? rawViewerId : undefined,
    privacy: { analyticsMode, gpc },
  }
}

export type ViewerSessionExchangeResult = Awaited<ReturnType<typeof exchangeShareToken>>

export function setViewerSessionCookies(response: NextResponse, requestUrl: string, result: ViewerSessionExchangeResult) {
  const secureCookies = new URL(requestUrl).protocol === 'https:'
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  response.cookies.set({
    name: getViewerSessionCookieName(result.shareCode),
    value: result.rawSessionToken,
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    ...(result.expiresAt ? { expires: new Date(result.expiresAt) } : {}),
  })
  if (result.rawViewerId) {
    response.cookies.set({
      name: VIEWER_ID_COOKIE,
      value: result.rawViewerId,
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 730,
    })
  } else {
    response.cookies.set({
      name: VIEWER_ID_COOKIE,
      value: '',
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }
}

export function clearViewerSessionCookie(response: NextResponse, requestUrl: string, shareIdentifier: string) {
  const secureCookies = new URL(requestUrl).protocol === 'https:'
  response.cookies.set({
    name: getViewerSessionCookieName(shareIdentifier),
    value: '',
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/**
 * A legacy /s/<token> request already created the viewer session before it
 * redirects to /view/<share-code>. The direct-share proxy consumes this
 * short-lived marker so that redirect does not create a second visit.
 */
export function setShareRedirectCookie(response: NextResponse, requestUrl: string, shareCode: string) {
  const secureCookies = new URL(requestUrl).protocol === 'https:'
  response.cookies.set({
    name: SHARE_REDIRECT_COOKIE,
    value: shareCode,
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 60,
  })
}

export function clearShareRedirectCookie(response: NextResponse, requestUrl: string) {
  const secureCookies = new URL(requestUrl).protocol === 'https:'
  response.cookies.set({
    name: SHARE_REDIRECT_COOKIE,
    value: '',
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Make the session available to the Server Components rendered for this same
 * request. Response cookies alone only reach the next browser request.
 */
export function setViewerSessionRequestCookie(requestHeaders: Headers, result: ViewerSessionExchangeResult) {
  replaceRequestCookie(requestHeaders, getViewerSessionCookieName(result.shareCode), result.rawSessionToken)
  replaceRequestCookie(requestHeaders, VIEWER_ID_COOKIE, result.rawViewerId ?? null)
}

function replaceRequestCookie(requestHeaders: Headers, name: string, value: string | null) {
  const entries = (requestHeaders.get('cookie') ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry && !entry.startsWith(`${name}=`))

  if (value) entries.push(`${name}=${value}`)
  if (entries.length > 0) requestHeaders.set('cookie', entries.join('; '))
  else requestHeaders.delete('cookie')
}
