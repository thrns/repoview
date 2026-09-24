import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { createSupabaseAdminClient } from '../supabase/admin'
import { createSupabaseServerClient } from '../supabase/server'
import type { Tables } from '../supabase/database.types'

export type SystemAdminContext = {
  user: User
  systemAdmin: Tables<'system_admins'>
}

/**
 * Resolve the current operator without consulting workspace membership. This
 * is deliberately a separate authorization boundary from requireWorkspace().
 */
export async function getSystemAdminContext(): Promise<SystemAdminContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: userResult, error: userError } = await supabase.auth.getUser()
  if (userError || !userResult.user) return null

  const admin = createSupabaseAdminClient()
  const { data: systemAdmin, error: systemAdminError } = await admin
    .from('system_admins')
    .select('*')
    .eq('user_id', userResult.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (systemAdminError || !systemAdmin) return null
  return { user: userResult.user, systemAdmin: systemAdmin as Tables<'system_admins'> }
}

/**
 * Page/layout guard for the isolated operator surface. A system admin does
 * not become an owner, admin, or member of any customer workspace by passing
 * this check.
 */
export async function requireSystemAdmin(): Promise<SystemAdminContext> {
  const context = await getSystemAdminContext()
  if (!context) redirect('/login?error=forbidden')
  return context
}

export async function requireSystemAdminUser(): Promise<User> {
  return (await requireSystemAdmin()).user
}
