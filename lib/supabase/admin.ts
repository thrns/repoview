import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { getPublicEnv } from '../env/public'
import { getSupabaseAdminEnv } from '../env/server'
import type { Database } from './database.types'

export function createSupabaseAdminClient() {
  const publicEnv = getPublicEnv()
  const serverEnv = getSupabaseAdminEnv()

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
