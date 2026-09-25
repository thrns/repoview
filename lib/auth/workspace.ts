import 'server-only'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

import type { Tables, WorkspaceRole } from '@/lib/supabase/database.types'

export type WorkspaceContext = {
  user: User
  workspace: Tables<'workspaces'>
  membership: Tables<'workspace_members'>
}

export type WorkspaceSelection = {
  workspace: Tables<'workspaces'>
  membership: Tables<'workspace_members'>
}

export type ActiveWorkspaceContext = WorkspaceContext & {
  availableWorkspaces: WorkspaceSelection[]
}

export const ACTIVE_WORKSPACE_COOKIE = 'repoview-active-workspace'

export type AuthorizedRepository = WorkspaceContext & {
  repository: Tables<'repositories'>
}

export type AuthorizedShare = WorkspaceContext & {
  share: Tables<'shares'>
}

export class AuthorizationError extends Error {
  readonly code: 'unauthenticated' | 'forbidden' | 'not_found'

  constructor(code: 'unauthenticated' | 'forbidden' | 'not_found', message = 'You are not authorized to access this resource.') {
    super(message)
    this.name = 'AuthorizationError'
    this.code = code
  }
}

async function getAuthenticatedClient() {
  const { createSupabaseServerClient } = await import('../supabase/server')
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new AuthorizationError('unauthenticated', 'Authentication is required.')
  }

  return { supabase, user: data.user }
}

/** Authentication only. This helper deliberately does not infer a workspace. */
export async function requireUser(): Promise<User> {
  const { user } = await getAuthenticatedClient()
  return user
}

export async function requireWorkspaceMember(workspaceId: string): Promise<WorkspaceContext> {
  if (!isUuid(workspaceId)) {
    throw new AuthorizationError('forbidden')
  }

  const context = await requireWorkspace()
  if (context.workspace.id !== workspaceId) {
    throw new AuthorizationError('forbidden')
  }
  return context
}

export async function requireWorkspaceRole(workspaceId: string, allowedRoles: WorkspaceRole[]): Promise<WorkspaceContext> {
  const context = await requireWorkspaceMember(workspaceId)
  if (!allowedRoles.includes(context.membership.role)) {
    throw new AuthorizationError('forbidden')
  }
  return context
}

export async function requireRepositoryAccess(repositoryId: string): Promise<AuthorizedRepository> {
  if (!isUuid(repositoryId)) {
    throw new AuthorizationError('not_found')
  }

  const { supabase } = await getAuthenticatedClient()
  const { data: repository, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', repositoryId)
    .maybeSingle()

  // The authenticated Supabase client is RLS-filtered, and the active
  // workspace lookup makes the tenant boundary explicit to callers.
  if (error || !repository) {
    throw new AuthorizationError('not_found')
  }

  const authorizedRepository = repository as Tables<'repositories'>
  const context = await requireWorkspace()
  if (context.workspace.id !== authorizedRepository.workspace_id) {
    throw new AuthorizationError('forbidden')
  }
  return { ...context, repository: authorizedRepository }
}

export async function requireShareAccess(shareId: string): Promise<AuthorizedShare> {
  if (!isUuid(shareId)) {
    throw new AuthorizationError('not_found')
  }

  const { supabase } = await getAuthenticatedClient()
  const { data: share, error } = await supabase
    .from('shares')
    .select('*')
    .eq('id', shareId)
    .maybeSingle()

  if (error || !share) {
    throw new AuthorizationError('not_found')
  }

  const authorizedShare = share as Tables<'shares'>
  const context = await requireWorkspace()
  if (context.workspace.id !== authorizedShare.workspace_id) {
    throw new AuthorizationError('forbidden')
  }
  return { ...context, share: authorizedShare }
}

export async function getUserWorkspaceMemberships(): Promise<{ user: User; workspaces: WorkspaceSelection[] }> {
  const { supabase, user } = await getAuthenticatedClient()
  const membershipsResult = await supabase
    .from('workspace_members')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (membershipsResult.error) {
    throw new AuthorizationError('forbidden', 'Workspace memberships are unavailable.')
  }

  const memberships = (membershipsResult.data ?? []) as Tables<'workspace_members'>[]
  if (memberships.length === 0) return { user, workspaces: [] }

  const workspaceIds = memberships.map((membership) => membership.workspace_id)
  const workspacesResult = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds)

  if (workspacesResult.error) {
    throw new AuthorizationError('forbidden', 'Workspaces are unavailable.')
  }

  const workspacesById = new Map((workspacesResult.data ?? []).map((workspace) => [workspace.id, workspace as Tables<'workspaces'>]))
  const allSelections = memberships
    .map((membership) => {
      const workspace = workspacesById.get(membership.workspace_id)
      return workspace ? { workspace, membership } : null
      })
    .filter((selection): selection is WorkspaceSelection => Boolean(selection))

  if (allSelections.length !== memberships.length) {
    throw new AuthorizationError('forbidden', 'One or more workspace memberships are unavailable.')
  }

  const selections = allSelections
    .filter((selection) => selection.workspace.status === 'active')

  return { user, workspaces: selections }
}

export function resolveActiveWorkspaceId(workspaces: WorkspaceSelection[], requestedWorkspaceId: string | null | undefined) {
  if (workspaces.length === 1) return workspaces[0].workspace.id
  if (!requestedWorkspaceId) return null
  return workspaces.some((selection) => selection.workspace.id === requestedWorkspaceId) ? requestedWorkspaceId : null
}

export async function requireWorkspace(options: { roles?: WorkspaceRole[] } = {}): Promise<ActiveWorkspaceContext> {
  try {
    const { user, workspaces } = await getUserWorkspaceMemberships()
    if (workspaces.length === 0) {
      redirect('/workspace/select')
    }

    const activeWorkspaceId = resolveActiveWorkspaceId(workspaces, (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value)
    if (!activeWorkspaceId) {
      redirect('/workspace/select')
    }

    const selected = workspaces.find((selection) => selection.workspace.id === activeWorkspaceId)
    if (!selected) {
      throw new AuthorizationError('forbidden', 'The active workspace is unavailable.')
    }

    const { workspace, membership } = selected
    if (options.roles && !options.roles.includes(membership.role)) {
      throw new AuthorizationError('forbidden')
    }

    return { user, workspace, membership, availableWorkspaces: workspaces }
  } catch (error) {
    if (isRedirectError(error)) throw error
    if (error instanceof AuthorizationError) {
      redirect(error.code === 'unauthenticated' ? '/login' : '/dashboard?error=forbidden')
    }
    redirect('/login?error=unavailable')
  }
}

export async function requireWorkspaceAdmin() {
  const context = await requireWorkspace()
  if (!['owner', 'admin'].includes(context.membership.role)) {
    throw new AuthorizationError('forbidden')
  }
  return context
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
