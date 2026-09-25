import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireViewerSession } from '../../../../lib/auth/viewer-session'
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin'
import { isGlobalPrivacyControl } from '../../../../lib/viewer/privacy-shared'
import { checkPublicRateLimit, checkRateLimits, rateLimitResponse, rateLimitUnavailableResponse } from '../../../../lib/security/rate-limit'
import { isRequestBodyTooLarge, readJsonBody } from '../../../../lib/security/body-limit'

const MAX_HEARTBEAT_BODY_BYTES = 16 * 1024

const heartbeatRequestSchema = z.object({
  shareId: z.string().uuid().or(z.string().regex(/^[A-Za-z0-9_-]{8}$/)),
  activeMs: z.number().finite().min(0).max(86_400_000).optional(),
  exitPath: z.string().trim().max(512).nullable().optional(),
})

export async function POST(request: Request) {
  let parsedRequest: z.infer<typeof heartbeatRequestSchema>
  try {
    parsedRequest = heartbeatRequestSchema.parse(await readJsonBody(request, MAX_HEARTBEAT_BODY_BYTES))
  } catch (error) {
    if (isRequestBodyTooLarge(error)) return NextResponse.json({ error: 'payload_too_large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const decision = await checkPublicRateLimit(request, 'public-viewer-heartbeat')
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try {
    viewer = await requireViewerSession(parsedRequest.shareId)
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const decision = await checkRateLimits('public-viewer-heartbeat', [
      { value: `session:${viewer.session.id}` },
    ])
    if (decision) return rateLimitResponse(decision)
  } catch {
    return rateLimitUnavailableResponse()
  }

  const internalShareId = viewer.share?.id ?? parsedRequest.shareId
  const admin = createSupabaseAdminClient()
  const collectOptionalAnalytics = viewer.session.analytics_mode === 'optional' && viewer.session.gpc_applied !== true && !isGlobalPrivacyControl(request.headers.get('sec-gpc'))
  const update = {
    last_seen_at: new Date().toISOString(),
    ...(collectOptionalAnalytics ? {
      ...(parsedRequest.activeMs !== undefined ? { active_ms: Math.floor(parsedRequest.activeMs) } : {}),
      ...(parsedRequest.exitPath !== undefined ? { exit_path: parsedRequest.exitPath } : {}),
    } : {}),
  }
  const { data: updatedSession, error: updateError } = await admin
    .from('viewer_sessions')
    .update(update)
    .eq('id', viewer.session.id)
    .eq('share_id', internalShareId)
    .eq('workspace_id', viewer.share.workspace_id)
    .select('id')
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
  if (!updatedSession) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
