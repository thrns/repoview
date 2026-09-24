import { NextResponse } from 'next/server'

import { getPublicEnv } from '../../../../lib/env/public'
import { checkPublicRateLimit, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const next = normalizeNextPath(requestUrl.searchParams.get('next'))

  try {
    const decision = await checkPublicRateLimit(request, 'auth-login')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  try {
    const env = getPublicEnv()
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error || !data.url) return redirectToLogin(requestUrl, 'oauth_error')
    const response = NextResponse.redirect(data.url, 303)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch {
    return redirectToLogin(requestUrl, 'oauth_error')
  }
}

function normalizeNextPath(value: string | null) {
  return value === '/onboarding' ? '/onboarding' : '/dashboard'
}

function redirectToLogin(requestUrl: URL, error: string) {
  const url = new URL('/login', requestUrl.origin)
  url.searchParams.set('error', error)
  return NextResponse.redirect(url, 303)
}
