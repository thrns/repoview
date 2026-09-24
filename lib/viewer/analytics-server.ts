import 'server-only'

import { after } from 'next/server'

import { requireViewerSession } from '@/lib/auth/viewer-session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
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
}) {
  const viewer = await requireViewerSession(shareId)
  const internalShareId = viewer.share.id
  const admin = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const update = buildSessionUpdate(viewer.session, clientContext, session, now)
  if (events.filter((event) => ['file_opened', 'file_viewed', 'markdown_viewed'].includes(event.eventType)).length >= 8) {
    update.security_signals = {
      ...(isRecord(viewer.session.security_signals) ? viewer.session.security_signals : {}),
      rapid_file_traversal: true,
    }
  }
  const maxDirectoryDepth = Math.max(0, ...events.map((event) => event.path ? Math.max(0, event.path.split('/').length - 1) : 0))
  if (maxDirectoryDepth > numberValue(viewer.session.max_directory_depth)) update.max_directory_depth = maxDirectoryDepth

  if (Object.keys(update).length > 0) {
    const { error } = await admin.from('viewer_sessions').update(update as never).eq('id', viewer.session.id).eq('share_id', internalShareId).eq('workspace_id', viewer.share.workspace_id)
    if (error) throw error
  }

  if (events.length > 0) {
    const rows = events.map((event) => ({
      workspace_id: viewer.share.workspace_id,
      share_id: internalShareId,
      session_id: viewer.session.id,
      event_type: event.eventType,
      path: sanitizePath(event.path),
      metadata: {
        ...(event.metadata ?? {}),
        ...(typeof event.clientSequence === 'number' ? { client_sequence: event.clientSequence } : {}),
        source: 'client',
      },
    }))
    const { error } = await admin.from('view_events').insert(rows)
    if (error) throw error

    await updateFileEngagement(admin, internalShareId, viewer.session.id, viewer.session.viewer_id, viewer.share.workspace_id, events, now)
  }

  if (session?.ended) {
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
    update.idle_ms = Math.max(numberValue(current.idle_ms), Math.max(0, Math.floor(snapshot.idleMs)))
    update.visibility_changes = Math.max(numberValue(current.visibility_changes), Math.max(0, Math.floor(snapshot.visibilityChanges)))
    update.focus_changes = Math.max(numberValue(current.focus_changes), Math.max(0, Math.floor(snapshot.focusChanges)))
    if (snapshot.entryPath) update.entry_path = sanitizePath(snapshot.entryPath)
    if (snapshot.exitPath) update.exit_path = sanitizePath(snapshot.exitPath)
    if (snapshot.ended) update.ended_at = now
  }
  if (clientContext) {
    const context = sanitizeClientContext(clientContext)
    Object.assign(update, {
      device_type: context.deviceType,
      browser: context.browser,
      browser_version: context.browserVersion,
      rendering_engine: context.renderingEngine,
      os: context.os,
      os_version: context.osVersion,
      architecture: context.architecture,
      primary_language: context.primaryLanguage,
      languages: context.languages,
      browser_timezone: context.browserTimezone,
      screen_width: context.screenWidth,
      screen_height: context.screenHeight,
      viewport_width: context.viewportWidth,
      viewport_height: context.viewportHeight,
      pixel_ratio: context.pixelRatio,
      color_depth: context.colorDepth,
      orientation: context.orientation,
      logical_cpu_count: context.logicalCpuCount,
      approximate_memory_gb: context.approximateMemoryGb,
      touch_capable: context.touchCapable,
      dark_mode: context.darkMode,
      reduced_motion: context.reducedMotion,
    })
  }
  return update
}

function sanitizeClientContext(input: ViewerClientContext): ViewerClientContext {
  const numberField = (value: number | null | undefined, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? Math.round(value * 100) / 100 : null
  const stringField = (value: string | null | undefined, max = 255) => {
    const normalized = value?.trim().replace(/[\u0000-\u001f\u007f]/g, ' ') ?? ''
    return normalized && normalized.length <= max ? normalized : null
  }
  return {
    deviceType: input.deviceType === 'desktop' || input.deviceType === 'mobile' || input.deviceType === 'tablet' ? input.deviceType : null,
    browser: stringField(input.browser),
    browserVersion: stringField(input.browserVersion, 64),
    renderingEngine: stringField(input.renderingEngine),
    os: stringField(input.os),
    osVersion: stringField(input.osVersion, 64),
    architecture: stringField(input.architecture, 64),
    primaryLanguage: stringField(input.primaryLanguage, 32),
    languages: Array.isArray(input.languages) ? input.languages.map((value) => stringField(value, 32)).filter((value): value is string => Boolean(value)).slice(0, 20) : [],
    browserTimezone: stringField(input.browserTimezone, 128),
    screenWidth: numberField(input.screenWidth, 1, 20_000),
    screenHeight: numberField(input.screenHeight, 1, 20_000),
    viewportWidth: numberField(input.viewportWidth, 1, 20_000),
    viewportHeight: numberField(input.viewportHeight, 1, 20_000),
    pixelRatio: numberField(input.pixelRatio, 0.1, 20),
    colorDepth: numberField(input.colorDepth, 1, 128),
    orientation: stringField(input.orientation, 32),
    logicalCpuCount: numberField(input.logicalCpuCount, 1, 256),
    approximateMemoryGb: numberField(input.approximateMemoryGb, 0.25, 512),
    touchCapable: typeof input.touchCapable === 'boolean' ? input.touchCapable : null,
    darkMode: typeof input.darkMode === 'boolean' ? input.darkMode : null,
    reducedMotion: typeof input.reducedMotion === 'boolean' ? input.reducedMotion : null,
  }
}

async function updateFileEngagement(admin: ReturnType<typeof createSupabaseAdminClient>, shareId: string, sessionId: string, viewerId: string | null, workspaceId: string, events: ViewerAnalyticsEvent[], now: string) {
  const fileEvents = events.filter((event) => event.path && ['file_opened', 'file_viewed', 'markdown_viewed', 'mermaid_viewed', 'image_viewed', 'raw_file_viewed', 'scroll_depth'].includes(event.eventType))
  const grouped = new Map<string, ViewerAnalyticsEvent[]>()
  for (const event of fileEvents) {
    const path = event.path as string
    grouped.set(path, [...(grouped.get(path) ?? []), event])
  }

  for (const [path, pathEvents] of grouped) {
    const { data: existing, error: lookupError } = await admin.from('file_engagement').select('*').eq('session_id', sessionId).eq('workspace_id', workspaceId).eq('path', path).maybeSingle()
    if (lookupError) throw lookupError
    const scrollPercent = Math.max(0, ...pathEvents.map((event) => typeof event.metadata?.percent === 'number' ? event.metadata.percent : 0))
    const activeDwellMs = pathEvents.reduce((total, event) => total + (typeof event.metadata?.active_ms === 'number' ? Math.max(0, event.metadata.active_ms) : typeof event.metadata?.dwell_ms === 'number' ? Math.max(0, event.metadata.dwell_ms) : 0), 0)
    const idleDwellMs = pathEvents.reduce((total, event) => total + (typeof event.metadata?.idle_ms === 'number' ? Math.max(0, event.metadata.idle_ms) : 0), 0)
    const openCount = pathEvents.filter((event) => event.eventType !== 'scroll_depth').length
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
        idle_ms: idleDwellMs,
        max_scroll_percent: scrollPercent,
        first_view_order: firstViewOrder,
      })
      if (error) throw error
      continue
    }
    const { error } = await admin.from('file_engagement').update({
      last_viewed_at: now,
      view_count: existing.view_count + openCount,
      active_ms: Number(existing.active_ms ?? 0) + activeDwellMs,
      idle_ms: Number(existing.idle_ms ?? 0) + idleDwellMs,
      max_scroll_percent: Math.max(Number(existing.max_scroll_percent) || 0, scrollPercent),
      content_kind: typeof contentKind === 'string' ? contentKind : existing.content_kind,
    }).eq('id', existing.id).eq('workspace_id', workspaceId).eq('session_id', sessionId)
    if (error) throw error
  }
}

async function notifySessionSummarySafely({ shareId, sessionId, share, repository }: { shareId: string; sessionId: string; share: Record<string, unknown>; repository: Record<string, unknown> }) {
  try {
    const { notifySessionSummary } = await import('@/lib/notifications/notify-view')
    await notifySessionSummary({ shareId, sessionId, share, repository })
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
