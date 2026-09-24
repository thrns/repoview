import { after, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireViewerSession } from '../../../../lib/auth/viewer-session'
import { dispatchNotificationDelivery } from '../../../../lib/notifications/delivery'
import { notifyConfirmedViewer } from '../../../../lib/notifications/notify-view'
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin'
import type { ViewerClientContext } from '../../../../lib/viewer/analytics-types'

const clientContextSchema = z.object({
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).nullable().optional(),
  browser: z.string().max(255).nullable().optional(),
  browserVersion: z.string().max(64).nullable().optional(),
  renderingEngine: z.string().max(255).nullable().optional(),
  os: z.string().max(255).nullable().optional(),
  osVersion: z.string().max(64).nullable().optional(),
  architecture: z.string().max(64).nullable().optional(),
  primaryLanguage: z.string().max(32).nullable().optional(),
  languages: z.array(z.string().max(32)).max(20).optional(),
  browserTimezone: z.string().max(128).nullable().optional(),
  screenWidth: z.number().finite().nullable().optional(),
  screenHeight: z.number().finite().nullable().optional(),
  viewportWidth: z.number().finite().nullable().optional(),
  viewportHeight: z.number().finite().nullable().optional(),
  pixelRatio: z.number().finite().nullable().optional(),
  colorDepth: z.number().finite().nullable().optional(),
  orientation: z.string().max(32).nullable().optional(),
  logicalCpuCount: z.number().finite().nullable().optional(),
  approximateMemoryGb: z.number().finite().nullable().optional(),
  touchCapable: z.boolean().nullable().optional(),
  darkMode: z.boolean().nullable().optional(),
  reducedMotion: z.boolean().nullable().optional(),
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
  const { data: confirmedSession, error: confirmError } = await admin
    .from('viewer_sessions')
    .update({
      confirmed_at: confirmedAt,
      last_seen_at: confirmedAt,
      entry_path: parsedRequest.entryPath ?? null,
      ...(clientContext ? {
        device_type: clientContext.deviceType ?? null,
        browser: clientContext.browser ?? null,
        browser_version: clientContext.browserVersion ?? null,
        rendering_engine: clientContext.renderingEngine ?? null,
        os: clientContext.os ?? null,
        os_version: clientContext.osVersion ?? null,
        architecture: clientContext.architecture ?? null,
        primary_language: clientContext.primaryLanguage ?? null,
        languages: clientContext.languages ?? [],
        browser_timezone: clientContext.browserTimezone ?? null,
        screen_width: clientContext.screenWidth ?? null,
        screen_height: clientContext.screenHeight ?? null,
        viewport_width: clientContext.viewportWidth ?? null,
        viewport_height: clientContext.viewportHeight ?? null,
        pixel_ratio: clientContext.pixelRatio ?? null,
        color_depth: clientContext.colorDepth ?? null,
        orientation: clientContext.orientation ?? null,
        logical_cpu_count: clientContext.logicalCpuCount ?? null,
        approximate_memory_gb: clientContext.approximateMemoryGb ?? null,
        touch_capable: clientContext.touchCapable ?? null,
        dark_mode: clientContext.darkMode ?? null,
        reduced_motion: clientContext.reducedMotion ?? null,
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

  try {
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
