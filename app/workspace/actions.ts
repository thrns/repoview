'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { ACTIVE_WORKSPACE_COOKIE, getUserWorkspaceMemberships } from '../../lib/auth/workspace'

const workspaceIdSchema = z.string().uuid()

export async function selectActiveWorkspace(input: FormData) {
  const workspaceId = workspaceIdSchema.parse(input.get('workspaceId'))
  const { workspaces } = await getUserWorkspaceMemberships()
  const selected = workspaces.find((selection) => selection.workspace.id === workspaceId)

  if (!selected) {
    throw new Error('That workspace is not available to your account.')
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, selected.workspace.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  redirect('/dashboard')
}
