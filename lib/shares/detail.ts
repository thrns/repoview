import 'server-only'

import { requireShareAccess } from '../auth/workspace'
import { createSupabaseServerClient } from '../supabase/server'
import type { Json } from '../supabase/database.types'
import { getShareStatus, type ShareDashboardItem } from './dashboard'

export class ShareDetailNotFoundError extends Error {
  constructor() {
    super('Share not found.')
    this.name = 'ShareDetailNotFoundError'
  }
}

export interface ShareSessionSummary {
  id: string
  firstSeenAt: string
  lastSeenAt: string
  confirmedAt: string | null
  browser: string | null
  os: string | null
  deviceType: string | null
  country: string | null
  isProbableBot: boolean
  approximateDurationMinutes: number
  viewedPaths: string[]
}

export interface ShareActivitySummary {
  id: number
  sessionId: string
  eventType: string
  path: string | null
  metadata: Json
  createdAt: string
}

export interface ShareNotificationSummary {
  id: string
  channel: string
  status: string
  errorText: string | null
  attemptCount: number
  providerMessageId: string | null
  createdAt: string
  sentAt: string | null
}

export interface ShareDetailData {
  item: ShareDashboardItem
  sessions: ShareSessionSummary[]
  activity: ShareActivitySummary[]
  notifications: ShareNotificationSummary[]
}

export async function getShareDetail(id: string, now = new Date()): Promise<ShareDetailData> {
  if (!isUuid(id)) {
    throw new ShareDetailNotFoundError()
  }

  let access: Awaited<ReturnType<typeof requireShareAccess>>
  try {
    access = await requireShareAccess(id)
  } catch {
    throw new ShareDetailNotFoundError()
  }

  const supabase = await createSupabaseServerClient()
  const { share, workspace } = access

  const [{ data: repository, error: repositoryError }, { data: sessions, error: sessionsError }, { data: events, error: eventsError }, { data: notifications, error: notificationsError }] = await Promise.all([
    supabase.from('repositories').select('*').eq('id', share.repository_id).eq('workspace_id', workspace.id).maybeSingle(),
    supabase.from('viewer_sessions').select('*').eq('share_id', id).eq('workspace_id', workspace.id).order('last_seen_at', { ascending: false }),
    supabase.from('view_events').select('*').eq('share_id', id).eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('notification_deliveries').select('*').eq('share_id', id).eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(50),
  ])

  if (repositoryError || sessionsError || eventsError || notificationsError) {
    throw new Error('RepoView share detail could not be loaded.')
  }

  const sessionRows = sessions ?? []
  const confirmedSessions = sessionRows.filter((session) => session.confirmed_at !== null)
  const viewedPathsBySession = new Map<string, string[]>()
  for (const event of events ?? []) {
    if (!event.path || !['file_viewed', 'markdown_viewed', 'directory_viewed'].includes(event.event_type)) continue
    const paths = viewedPathsBySession.get(event.session_id) ?? []
    if (!paths.includes(event.path)) paths.push(event.path)
    viewedPathsBySession.set(event.session_id, paths)
  }
  const lastViewedAt = confirmedSessions.reduce<string | null>((latest, session) => {
    if (!latest || new Date(session.last_seen_at).getTime() > new Date(latest).getTime()) {
      return session.last_seen_at
    }
    return latest
  }, null)

  return {
    item: {
      share,
      repository: repository ?? null,
      status: getShareStatus(share, repository ?? null, now),
      confirmedViews: confirmedSessions.length,
      lastViewedAt,
    },
    sessions: sessionRows.map((session) => ({
      id: session.id,
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at,
      confirmedAt: session.confirmed_at,
      browser: session.browser,
      os: session.os,
      deviceType: session.device_type,
      country: session.country,
      isProbableBot: session.is_probable_bot,
      approximateDurationMinutes: getApproximateDurationMinutes(session.first_seen_at, session.last_seen_at, session.confirmed_at),
      viewedPaths: viewedPathsBySession.get(session.id) ?? [],
    })),
    activity: (events ?? []).map((event) => ({
      id: event.id,
      sessionId: event.session_id,
      eventType: event.event_type,
      path: event.path,
      metadata: event.metadata,
      createdAt: event.created_at,
    })),
    notifications: (notifications ?? []).map((notification) => ({
      id: notification.id,
      channel: notification.channel,
      status: notification.status,
      errorText: notification.last_error,
      attemptCount: notification.attempt_count,
      providerMessageId: notification.provider_message_id,
      createdAt: notification.created_at,
      sentAt: notification.sent_at,
    })),
  }
}

function getApproximateDurationMinutes(firstSeenAt: string, lastSeenAt: string, confirmedAt: string | null) {
  const startAt = confirmedAt ?? firstSeenAt
  const durationMs = Math.max(0, new Date(lastSeenAt).getTime() - new Date(startAt).getTime())
  return Math.round(durationMs / 60_000)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
