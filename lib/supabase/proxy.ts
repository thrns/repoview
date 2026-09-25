import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { getPublicEnv } from '@/lib/env/public'

export async function updateSupabaseSession(request: NextRequest, options: { requestHeaders?: Headers } = {}) {
  const requestHeaders = options.requestHeaders ?? new Headers(request.headers)
  let response = NextResponse.next({ request: { headers: requestHeaders } })
  const env = getPublicEnv()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: requestHeaders } })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  await supabase.auth.getUser()
  return response
}
