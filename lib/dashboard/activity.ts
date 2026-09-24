import 'server-only'

import { requireWorkspace } from '../auth/workspace'
import { createSupabaseServerClient } from '../supabase/server'
import type { Json } from '../supabase/database.types'

export type ActivityFilter = 'all' | 'views' | 'notifications'

export type DashboardActivityItem = {
  id: string
  category: 'view' | 'notification'
  shareId: string
  sessionId: string
  viewerId: string | null
  viewerCode: string | null
  eventType: string
  occurredAt: string
  metadata: Json
  recipientLabel: string
  repositoryName: string
  path: string | null
  status: string | null
  browser: string | null
  deviceType: string | null
  country: string | null
  sessionStartedAt: string | null
  sessionLastSeenAt: string | null
  sessionEndedAt: string | null
  sessionActiveMs: number
  sessionIdleMs: number
}

export async function getDashboardActivity(filter: ActivityFilter = 'all'): Promise<DashboardActivityItem[]> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const [{ data: events, error: eventsError }, { data: notifications, error: notificationsError }] = await Promise.all([
    supabase.from('view_events').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('notification_deliveries').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(100),
  ])

  if (eventsError || notificationsError) {
    throw new Error('RepoView activity could not be loaded.')
  }

  const shareIds = new Set<string>()
  for (const event of events ?? []) shareIds.add(event.share_id)
  for (const notification of notifications ?? []) shareIds.add(notification.share_id)
  const resolvedShares = shareIds.size > 0
    ? await supabase.from('shares').select('id, recipient_label, repository_id').eq('workspace_id', workspace.id).in('id', [...shareIds])
    : { data: [], error: null }

  if (resolvedShares.error) {
    throw new Error('RepoView activity context could not be loaded.')
  }

  const repositoryIds = [...new Set((resolvedShares.data ?? []).map((share) => share.repository_id))]
  const resolvedRepositories = repositoryIds.length > 0
    ? await supabase.from('repositories').select('id, github_owner, github_repo').eq('workspace_id', workspace.id).in('id', repositoryIds)
    : { data: [], error: null }

  if (resolvedRepositories.error) {
    throw new Error('RepoView activity repositories could not be loaded.')
  }

  const sessionIds = [...new Set([
    ...(events ?? []).map((event) => event.session_id),
    ...(notifications ?? []).map((notification) => notification.session_id),
  ])]
  const resolvedSessions = sessionIds.length > 0
    ? await supabase.from('viewer_sessions').select('id, viewer_id, browser, device_type, country, first_seen_at, last_seen_at, ended_at, active_ms, idle_ms').eq('workspace_id', workspace.id).in('id', sessionIds)
    : { data: [], error: null }

  if (resolvedSessions.error) {
    throw new Error('RepoView activity sessions could not be loaded.')
  }

  const sharesById = new Map((resolvedShares.data ?? []).map((share) => [share.id, share]))
  const repositoriesById = new Map((resolvedRepositories.data ?? []).map((repository) => [repository.id, repository]))
  const sessionsById = new Map((resolvedSessions.data ?? []).map((session) => [session.id, session]))
  const viewerIds = [...new Set((resolvedSessions.data ?? []).map((session) => session.viewer_id).filter((value): value is string => Boolean(value)))]
  const resolvedViewers = viewerIds.length > 0
    ? await supabase.from('viewers').select('id, viewer_code').eq('workspace_id', workspace.id).in('id', viewerIds)
    : { data: [], error: null }

  if (resolvedViewers.error) {
    throw new Error('RepoView activity viewers could not be loaded.')
  }

  const viewersById = new Map((resolvedViewers.data ?? []).map((viewer) => [viewer.id, viewer]))
  const items: DashboardActivityItem[] = []

  if (filter !== 'notifications') {
    for (const event of events ?? []) {
      if (event.event_type === 'heartbeat') continue
      const share = sharesById.get(event.share_id)
      if (!share) continue
      const repository = repositoriesById.get(share.repository_id)
      const session = sessionsById.get(event.session_id)
      const viewer = session?.viewer_id ? viewersById.get(session.viewer_id) : undefined
      items.push({
        id: `event-${event.id}`,
        category: 'view',
        shareId: event.share_id,
        sessionId: event.session_id,
        viewerId: session?.viewer_id ?? null,
        viewerCode: viewer?.viewer_code ?? null,
        eventType: event.event_type,
        occurredAt: event.created_at,
        metadata: event.metadata,
        recipientLabel: share.recipient_label || 'Generic share',
        repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : 'Repository unavailable',
        path: event.path,
        status: null,
        browser: session?.browser ?? null,
        deviceType: session?.device_type ?? null,
        country: session?.country ?? null,
        sessionStartedAt: session?.first_seen_at ?? null,
        sessionLastSeenAt: session?.last_seen_at ?? null,
        sessionEndedAt: session?.ended_at ?? null,
        sessionActiveMs: Number(session?.active_ms ?? 0),
        sessionIdleMs: Number(session?.idle_ms ?? 0),
      })
    }
  }

  if (filter !== 'views') {
    for (const notification of notifications ?? []) {
      const share = sharesById.get(notification.share_id)
      if (!share) continue
      const repository = repositoriesById.get(share.repository_id)
      const session = sessionsById.get(notification.session_id)
      const viewer = session?.viewer_id ? viewersById.get(session.viewer_id) : undefined
      items.push({
        id: `notification-${notification.id}`,
        category: 'notification',
        shareId: notification.share_id,
        sessionId: notification.session_id,
        viewerId: session?.viewer_id ?? null,
        viewerCode: viewer?.viewer_code ?? null,
        eventType: 'notification',
        occurredAt: notification.created_at,
        metadata: notification.payload,
        recipientLabel: share.recipient_label || 'Generic share',
        repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : 'Repository unavailable',
        path: null,
        status: notification.status,
        browser: null,
        deviceType: null,
        country: null,
        sessionStartedAt: session?.first_seen_at ?? null,
        sessionLastSeenAt: session?.last_seen_at ?? null,
        sessionEndedAt: session?.ended_at ?? null,
        sessionActiveMs: Number(session?.active_ms ?? 0),
        sessionIdleMs: Number(session?.idle_ms ?? 0),
      })
    }
  }

  return items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
}
