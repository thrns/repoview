import { NextResponse } from 'next/server'

import { getAuthCallbackRedirectPath } from '@/lib/auth/redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectPath = getAuthCallbackRedirectPath(requestUrl.searchParams.get('next'))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
}
