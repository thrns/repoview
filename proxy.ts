import { type NextRequest, NextResponse } from 'next/server'

import { updateSupabaseSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.next()
  }
  return updateSupabaseSession(request)
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/login'],
}
