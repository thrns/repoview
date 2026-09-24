import 'server-only'

import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import type { Tables, WorkspaceRole } from '@/lib/supabase/database.types'

export type WorkspaceContext = {
  user: User
  workspace: Tables<'workspaces'>
  membership: Tables<'workspace_members'>
}

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

  const { supabase, user } = await getAuthenticatedClient()
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    throw new AuthorizationError('forbidden')
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError || !workspace || (workspace.status !== undefined && workspace.status !== 'active')) {
    throw new AuthorizationError('forbidden')
  }

  return { user, workspace: workspace as Tables<'workspaces'>, membership: membership as Tables<'workspace_members'> }
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

  // The authenticated Supabase client is RLS-filtered, and the explicit
  // membership lookup makes the authorization boundary clear to callers.
  if (error || !repository) {
    throw new AuthorizationError('not_found')
  }

  const authorizedRepository = repository as Tables<'repositories'>
  const context = await requireWorkspaceMember(authorizedRepository.workspace_id)
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
  const context = await requireWorkspaceMember(authorizedShare.workspace_id)
  return { ...context, share: authorizedShare }
}

export async function requireWorkspace(options: { roles?: WorkspaceRole[] } = {}): Promise<WorkspaceContext> {
  try {
    const { supabase, user } = await getAuthenticatedClient()
    const membershipResult = await supabase
      .from('workspace_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (membershipResult.error || !membershipResult.data) {
      throw new AuthorizationError('forbidden', 'No workspace membership is available.')
    }

    const membership = membershipResult.data as Tables<'workspace_members'>
    if (options.roles && !options.roles.includes(membership.role)) {
      throw new AuthorizationError('forbidden')
    }

    const workspaceResult = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', membership.workspace_id)
      .maybeSingle()

    if (workspaceResult.error || !workspaceResult.data || (workspaceResult.data.status !== undefined && workspaceResult.data.status !== 'active')) {
      throw new AuthorizationError('forbidden', 'The workspace is unavailable.')
    }

    return { user, workspace: workspaceResult.data as Tables<'workspaces'>, membership }
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
  return requireWorkspaceRole(context.workspace.id, ['owner', 'admin'])
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
}
