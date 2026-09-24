import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { getPublicEnv } from '@/lib/env/public'

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const env = getPublicEnv()
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  await supabase.auth.getUser()
  return response
}
