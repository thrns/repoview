import { type NextRequest, NextResponse } from 'next/server'

import { createContentSecurityPolicy } from '@/lib/security/csp'
import { updateSupabaseSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const contentSecurityPolicy = createContentSecurityPolicy({ nonce, isDevelopment: process.env.NODE_ENV === 'development' })
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)

  const shouldRefreshSession = /^(?:\/dashboard|\/onboarding|\/system-admin|\/login)(?:\/|$)/.test(request.nextUrl.pathname)
  const hasSupabaseConfiguration = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const response = shouldRefreshSession && hasSupabaseConfiguration
    ? await updateSupabaseSession(request, { requestHeaders })
    : NextResponse.next({ request: { headers: requestHeaders } })

  response.headers.set('Content-Security-Policy', contentSecurityPolicy)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
