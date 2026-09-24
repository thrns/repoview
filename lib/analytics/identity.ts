import 'server-only'

import { randomBytes } from 'node:crypto'

import { createSupabaseAdminClient } from '../supabase/admin'
import { hashViewerIdentity } from '../security/tokens'

export { VIEWER_ID_COOKIE, VIEWER_ID_STORAGE_KEY } from './constants'

const VIEWER_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/

export function generateViewerIdentity() {
  return randomBytes(24).toString('base64url')
}

export function isViewerIdentity(value: string | null | undefined): value is string {
  return Boolean(value && VIEWER_ID_PATTERN.test(value))
}

export function generateViewerCode() {
  return `A${randomBytes(2).toString('hex').slice(0, 3).toUpperCase()}`
}

export async function findOrCreateViewer(rawViewerId?: string) {
  const admin = createSupabaseAdminClient()
  const normalized = isViewerIdentity(rawViewerId) ? rawViewerId : generateViewerIdentity()
  const tokenHash = hashViewerIdentity(normalized)
  const existing = await admin.from('viewers').select('*').eq('viewer_token_hash', tokenHash).maybeSingle()

  if (existing.error) throw existing.error
  if (existing.data) {
    const { data: updated, error } = await admin
      .from('viewers')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('*')
      .single()
    if (error || !updated) throw error ?? new Error('Viewer identity could not be updated.')
    return { viewer: updated, rawViewerId: normalized, isNew: false }
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const inserted = await admin.from('viewers').insert({
      viewer_code: generateViewerCode(),
      viewer_token_hash: tokenHash,
    }).select('*').single()
    if (!inserted.error && inserted.data) {
      return { viewer: inserted.data, rawViewerId: normalized, isNew: true }
    }
    if (!isUniqueViolation(inserted.error)) throw inserted.error ?? new Error('Viewer identity could not be created.')
  }

  throw new Error('Viewer identity could not be allocated.')
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === '23505'
}
