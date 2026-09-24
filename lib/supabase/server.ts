import 'server-only'

import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getPublicEnv } from '@/lib/env/public'
import type { Database } from '@/lib/supabase/database.types'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const env = getPublicEnv()

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes
          // the session for requests where a response cookie can be sent.
        }
      },
    },
  })
}
