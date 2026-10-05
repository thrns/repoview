import 'server-only'

import { cookies } from 'next/headers'

import type { AccountMenuData } from '@/components/shared/account-menu'
import { ACTIVE_WORKSPACE_COOKIE, getUserWorkspaceMembershipsForUser, resolveActiveWorkspaceId } from '@/lib/auth/workspace'
import { hasSupabaseAuthCookie } from '@/lib/auth/supabase-session-cookie'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getLandingAccount(): Promise<AccountMenuData | null> {
  const cookieStore = await cookies()
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) return null

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null

  const [profileResult, workspaceResult] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', data.user.id).maybeSingle(),
    getUserWorkspaceMembershipsForUser(supabase, data.user).catch(() => null),
  ])

  const workspaces = workspaceResult?.workspaces ?? []
  const activeWorkspaceId = resolveActiveWorkspaceId(workspaces, cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value)
  const activeWorkspace = workspaces.find(({ workspace }) => workspace.id === activeWorkspaceId)?.workspace
  const displayName = profileResult.data?.full_name?.trim() || getMetadataName(data.user.user_metadata)

  return {
    email: data.user.email ?? '',
    displayName,
    workspaceName: activeWorkspace?.name ?? (workspaces.length === 1 ? workspaces[0].workspace.name : undefined),
    hasMultipleWorkspaces: workspaces.length > 1,
  }
}

function getMetadataName(metadata: Record<string, unknown>) {
  const value = metadata.full_name ?? metadata.name
  return typeof value === 'string' ? value : undefined
}
