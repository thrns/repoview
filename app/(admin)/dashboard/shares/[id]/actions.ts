'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireShareAccess, requireWorkspaceRole } from '../../../../../lib/auth/workspace'
import { getPublicEnv } from '../../../../../lib/env/public'
import { createSupabaseServerClient } from '../../../../../lib/supabase/server'
import { generateShareToken, hashShareToken } from '../../../../../lib/security/tokens'
import { enforceAuthenticatedRateLimit } from '../../../../../lib/security/rate-limit'

const shareIdSchema = z.string().uuid()
const expiryInputSchema = z.object({
  shareId: shareIdSchema,
  expiresAt: z.string().datetime({ offset: true }).nullable(),
})

export async function revokeShare(input: unknown) {
  const shareId = shareIdSchema.parse(input)
  const access = await requireShareAccess(shareId)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  await enforceAuthenticatedRateLimit('authenticated-share-rotate', access.workspace.id, access.user.id)
  const supabase = await createSupabaseServerClient()
  const query = supabase
    .from('shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
  const { data, error } = await query.eq('workspace_id', access.workspace.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new Error('This share is already revoked or could not be found.')
  }

  revalidatePath('/dashboard/shares')
  revalidatePath(`/dashboard/shares/${shareId}`)
  return { revoked: true as const }
}

export async function updateShareExpiry(input: unknown) {
  const parsed = expiryInputSchema.parse(input)
  const access = await requireShareAccess(parsed.shareId)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  await enforceAuthenticatedRateLimit('authenticated-share-rotate', access.workspace.id, access.user.id)

  if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
    throw new Error('Expiry must be in the future.')
  }

  const supabase = await createSupabaseServerClient()
  const query = supabase
    .from('shares')
    .update({ expires_at: parsed.expiresAt })
    .eq('id', parsed.shareId)
  const { data, error } = await query.eq('workspace_id', access.workspace.id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new Error('This share could not be updated.')
  }

  revalidatePath('/dashboard/shares')
  revalidatePath(`/dashboard/shares/${parsed.shareId}`)
  return { updated: true as const, expiresAt: parsed.expiresAt }
}

export async function rotateShare(input: unknown) {
  const shareId = shareIdSchema.parse(input)
  const access = await requireShareAccess(shareId)
  await requireWorkspaceRole(access.workspace.id, ['owner', 'admin'])
  await enforceAuthenticatedRateLimit('authenticated-share-rotate', access.workspace.id, access.user.id)
  const rawToken = generateShareToken()
  const supabase = await createSupabaseServerClient()
  const query = supabase
    .from('shares')
    .update({
      token_hash: hashShareToken(rawToken),
      revoked_at: null,
    })
    .eq('id', shareId)
  const { data, error } = await query.eq('workspace_id', access.workspace.id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    throw new Error('This share could not be rotated.')
  }

  revalidatePath('/dashboard/shares')
  revalidatePath(`/dashboard/shares/${shareId}`)
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  return { shareUrl: `${appUrl}/s/${rawToken}` }
}
