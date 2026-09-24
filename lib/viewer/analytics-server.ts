import 'server-only'

import { after } from 'next/server'

import { requireViewerSession } from '@/lib/auth/viewer-session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { releaseQuota, reserveQuota } from '@/lib/security/quotas'
import type { ViewerAnalyticsEvent, ViewerClientContext, ViewerSessionSnapshot } from './analytics-types'

export async function recordViewerAnalytics({
  shareId,
  events,
  clientContext,
  session,
}: {
  shareId: string
  events: ViewerAnalyticsEvent[]
  clientContext?: ViewerClientContext
  session?: ViewerSessionSnapshot
}, options: { gpcApplied?: boolean } = {}) {
  const viewer = await requireViewerSession(shareId)
  const internalShareId = viewer.share.id
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const collectOptionalAnalytics = viewer.session.analytics_mode === 'optional' && viewer.session.gpc_applied !== true && options.gpcApplied !== true
  const update = buildSessionUpdate(
    viewer.session,
    collectOptionalAnalytics ? clientContext : undefined,
    collectOptionalAnalytics ? session : undefined,
    now,
  )
  if (events.filter((event) => ['file_opened', 'file_viewed', 'markdown_viewed'].includes(event.eventType)).length >= 8) {
    update.security_signals = {
      ...(isRecord(viewer.session.security_signals) ? viewer.session.security_signals : {}),
      rapid_file_traversal: true,
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from('viewer_sessions').update(update as never).eq('id', viewer.session.id).eq('share_id', internalShareId).eq('workspace_id', viewer.share.workspace_id)
    if (error) throw error
  }

  if (collectOptionalAnalytics && events.length > 0) {
    const reservations = []
    let viewEventsInserted = false
    const rows = events.map((event) => ({
      workspace_id: viewer.share.workspace_id,
      share_id: internalShareId,
      session_id: viewer.session.id,
      event_type: event.eventType,
      path: sanitizePath(event.path),
      metadata: sanitizeEventMetadata(event.metadata),
    }))
    try {
      reservations.push(await reserveQuota('analytics-events-session', viewer.share.workspace_id, viewer.session.id, events.length, new Date(now), admin))
      reservations.push(await reserveQuota('analytics-events-workspace-daily', viewer.share.workspace_id, 'workspace', events.length, new Date(now), admin))

      const { error } = await admin.from('view_events').insert(rows)
      if (error) throw error
      viewEventsInserted = true

      await updateFileEngagement(admin, internalShareId, viewer.session.id, viewer.session.viewer_id, viewer.share.workspace_id, events, now)
    } catch (error) {
      if (!viewEventsInserted) {
        await Promise.all(reservations.reverse().map((reservation) => releaseQuota(reservation, admin)))
      }
      throw error
    }
  }

  if (collectOptionalAnalytics && session?.ended) {
    after(() => notifySessionSummarySafely({
      shareId: internalShareId,
      sessionId: viewer.session.id,
      share: viewer.share,
      repository: viewer.repository,
    }))
  }

  return { ok: true as const, recorded: events.length }
}

function buildSessionUpdate(
  current: Record<string, unknown>,
  clientContext: ViewerClientContext | undefined,
  snapshot: ViewerSessionSnapshot | undefined,
  now: string,
) {
  const update: Record<string, unknown> = { last_seen_at: now }
  if (snapshot) {
    update.active_ms = Math.max(numberValue(current.active_ms), Math.max(0, Math.floor(snapshot.activeMs)))
    if (snapshot.entryPath) update.entry_path = sanitizePath(snapshot.entryPath)
    if (snapshot.exitPath) update.exit_path = sanitizePath(snapshot.exitPath)
    if (snapshot.ended) update.ended_at = now
  }
  if (clientContext) {
    const context = sanitizeClientContext(clientContext)
    Object.assign(update, {
      device_type: context.deviceType,
      browser: context.browser,
      os: context.os,
    })
  }
  return update
}

function sanitizeClientContext(input: ViewerClientContext): ViewerClientContext {
  const stringField = (value: string | null | undefined, max = 255) => {
    const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, ' ') ?? ''
    return normalized && normalized.length <= max ? normalized : null
  }
  return {
    deviceType: input.deviceType === 'desktop' || input.deviceType === 'mobile' || input.deviceType === 'tablet' ? input.deviceType : null,
    browser: stringField(input.browser),
    os: stringField(input.os),
  }
}

async function updateFileEngagement(admin: ReturnType<typeof createSupabaseAdminClient>, shareId: string, sessionId: string, viewerId: string | null, workspaceId: string, events: ViewerAnalyticsEvent[], now: string) {
  const fileEvents = events.filter((event) => event.path && ['file_opened', 'file_viewed', 'markdown_viewed', 'mermaid_viewed', 'image_viewed', 'raw_file_viewed'].includes(event.eventType))
  const grouped = new Map<string, ViewerAnalyticsEvent[]>()
  for (const event of fileEvents) {
    const path = event.path as string
    grouped.set(path, [...(grouped.get(path) ?? []), event])
  }

  for (const [path, pathEvents] of grouped) {
    const { data: existing, error: lookupError } = await admin.from('file_engagement').select('*').eq('session_id', sessionId).eq('workspace_id', workspaceId).eq('path', path).maybeSingle()
    if (lookupError) throw lookupError
    const activeDwellMs = pathEvents.reduce((total, event) => total + (typeof event.metadata?.active_ms === 'number' ? Math.max(0, event.metadata.active_ms) : typeof event.metadata?.dwell_ms === 'number' ? Math.max(0, event.metadata.dwell_ms) : 0), 0)
    const openCount = pathEvents.length
    const contentKind = pathEvents.find((event) => typeof event.metadata?.content_kind === 'string')?.metadata?.content_kind
    const firstViewOrder = pathEvents.map((event) => event.clientSequence).filter((value): value is number => typeof value === 'number').sort((left, right) => left - right)[0] ?? null
    if (!existing) {
      const { error } = await admin.from('file_engagement').insert({
        workspace_id: workspaceId,
        share_id: shareId,
        session_id: sessionId,
        viewer_id: viewerId,
        path,
        content_kind: typeof contentKind === 'string' ? contentKind : null,
        first_viewed_at: now,
        last_viewed_at: now,
        view_count: Math.max(1, openCount),
        active_ms: activeDwellMs,
        first_view_order: firstViewOrder,
      })
      if (error) throw error
      continue
    }
    const { error } = await admin.from('file_engagement').update({
      last_viewed_at: now,
      view_count: existing.view_count + openCount,
      active_ms: Number(existing.active_ms ?? 0) + activeDwellMs,
      content_kind: typeof contentKind === 'string' ? contentKind : existing.content_kind,
    }).eq('id', existing.id).eq('workspace_id', workspaceId).eq('session_id', sessionId)
    if (error) throw error
  }
}

async function notifySessionSummarySafely({ shareId, sessionId, share, repository }: { shareId: string; sessionId: string; share: Record<string, unknown>; repository: Record<string, unknown> }) {
  try {
    const { notifySessionSummary } = await import('@/lib/notifications/notify-view')
    const notification = await notifySessionSummary({ shareId, sessionId, share, repository })
    if (notification.status === 'queued') {
      const { dispatchNotificationDelivery } = await import('@/lib/notifications/delivery')
      await dispatchNotificationDelivery(notification.deliveryId)
    }
  } catch {
    // Notification delivery is intentionally best effort.
  }
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function sanitizePath(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim().replace(/^\/+/, '')
  return normalized && normalized.length <= 512 ? normalized : null
}

function sanitizeEventMetadata(metadata: ViewerAnalyticsEvent['metadata'] = {}) {
  const result: Record<string, string | number | boolean> = {}
  const addString = (key: string, max: number, allowed?: Set<string>) => {
    const value = metadata[key]
    if (typeof value === 'string' && value.length <= max && (!allowed || allowed.has(value))) result[key] = value
  }
  const addNumber = (key: string, min: number, max: number) => {
    const value = metadata[key]
    if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max) result[key] = Math.round(value)
  }

  addString('content_kind', 64)
  addString('source', 32, new Set(['markdown']))
  addString('reason', 32, new Set(['pagehide']))
  addString('entry_page', 512)
  addString('route', 32)
  addString('preview', 32, new Set(['markdown']))
  addNumber('query_length', 0, 512)
  addNumber('line_count', 0, 100_000)
  addNumber('active_ms', 0, 86_400_000)
  addNumber('dwell_ms', 0, 86_400_000)
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
