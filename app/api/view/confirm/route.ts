import { after, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireViewerSession } from '../../../../lib/auth/viewer-session'
import { dispatchNotificationDelivery } from '../../../../lib/notifications/delivery'
import { notifyConfirmedViewer } from '../../../../lib/notifications/notify-view'
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin'
import type { ViewerClientContext } from '../../../../lib/viewer/analytics-types'
import { isGlobalPrivacyControl } from '../../../../lib/viewer/privacy-shared'

const clientContextSchema = z.object({
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).nullable().optional(),
  browser: z.string().max(255).nullable().optional(),
  os: z.string().max(255).nullable().optional(),
})
const confirmRequestSchema = z.object({
  shareId: z.string().uuid().or(z.string().regex(/^[A-Za-z0-9_-]{8}$/)),
  entryPath: z.string().trim().max(512).nullable().optional(),
  clientContext: clientContextSchema.optional(),
})

export async function POST(request: Request) {
  let parsedRequest: z.infer<typeof confirmRequestSchema>
  try {
    parsedRequest = confirmRequestSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  let viewer: Awaited<ReturnType<typeof requireViewerSession>>
  try {
    viewer = await requireViewerSession(parsedRequest.shareId)
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const internalShareId = viewer.share?.id ?? parsedRequest.shareId
  const confirmedAt = new Date().toISOString()
  const admin = createSupabaseAdminClient()
  const clientContext = parsedRequest.clientContext as ViewerClientContext | undefined
  const collectOptionalAnalytics = viewer.session.analytics_mode === 'optional' && viewer.session.gpc_applied !== true && !isGlobalPrivacyControl(request.headers.get('sec-gpc'))
  const { data: confirmedSession, error: confirmError } = await admin
    .from('viewer_sessions')
    .update({
      last_seen_at: confirmedAt,
      ...(collectOptionalAnalytics ? {
        confirmed_at: confirmedAt,
        entry_path: parsedRequest.entryPath ?? null,
      } : {}),
      ...(collectOptionalAnalytics && clientContext ? {
        device_type: clientContext.deviceType ?? null,
        browser: clientContext.browser ?? null,
        os: clientContext.os ?? null,
      } : {}),
    })
    .eq('id', viewer.session.id)
    .eq('share_id', internalShareId)
    .eq('workspace_id', viewer.share.workspace_id)
    .is('confirmed_at', null)
    .select('id, share_id, confirmed_at')
    .maybeSingle()

  if (confirmError) {
    return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!confirmedSession) {
    return NextResponse.json({ confirmed: false }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Confirmation is already durable on the session. The companion event is
  // best-effort so an analytics write cannot make a valid viewer lose access.
  if (collectOptionalAnalytics) {
    try {
      void Promise.resolve(admin.from('view_events').insert({
        workspace_id: viewer.share.workspace_id,
        share_id: internalShareId,
        session_id: confirmedSession.id,
        event_type: 'view_confirmed',
        path: null,
        metadata: {},
      } as never)).catch(() => undefined)
    } catch {
      // Best effort by design.
    }
  }

  if (collectOptionalAnalytics) try {
    const notification = await notifyConfirmedViewer({
      shareId: internalShareId,
      sessionId: confirmedSession.id,
      confirmedAt: confirmedSession.confirmed_at ?? confirmedAt,
      share: viewer.share,
      repository: viewer.repository,
      session: viewer.session,
    })
    if (notification.status === 'queued') {
      after(() => dispatchNotificationDelivery(notification.deliveryId).catch(() => undefined))
    }
  } catch {
    // Notification queueing must not make a confirmed viewer lose access.
  }

  return NextResponse.json({ confirmed: true }, { headers: { 'Cache-Control': 'no-store' } })
}
