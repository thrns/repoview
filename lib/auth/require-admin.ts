import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { getConfiguredAdminEmail } from '@/lib/env/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function requireAdmin(): Promise<User> {
  let user: User | null = null

  try {
    const supabase = await createSupabaseServerClient()
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    redirect('/login?error=unavailable')
  }

  if (!user) {
    redirect('/login')
  }

  const configuredAdminEmail = getConfiguredAdminEmail()
  if (configuredAdminEmail && user.email?.toLowerCase() !== configuredAdminEmail) {
    redirect('/login?error=forbidden')
  }

  return user
}
