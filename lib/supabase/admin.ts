import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { getPublicEnv } from '@/lib/env/public'
import { getServerEnv } from '@/lib/env/server'
import type { Database } from '@/lib/supabase/database.types'

export function createSupabaseAdminClient() {
  const publicEnv = getPublicEnv()
  const serverEnv = getServerEnv()

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
