import 'server-only'

import { createSupabaseAdminClient } from '../supabase/admin'
import { getShareStatus } from '../shares/dashboard'

export type DashboardOverviewActivity = {
  id: number
  eventType: string
  path: string | null
  sessionId: string
  viewerLabel: string
  eventCount: number
  metadata: Record<string, unknown>
  createdAt: string
  recipientLabel: string
  repositoryName: string
}

export type DashboardOverviewTimePoint = {
  label: string
  value: number
}

export type DashboardOverview = {
  activeShares: number
  totalViews: number
  uniqueAnonymousViewers: number
  returningViewers: number
  totalActiveViewingSeconds: number
  filesViewed: number
  downloads: number
  copyEvents: number
  confirmedViews30d: number
  uniqueConfirmedSessions30d: number
  enabledRepositories: number
  viewsOverTime: DashboardOverviewTimePoint[]
  recentActivity: DashboardOverviewActivity[]
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export async function getDashboardOverview(now = new Date()): Promise<DashboardOverview> {
  const admin = createSupabaseAdminClient()
  const since = new Date(now.getTime() - THIRTY_DAYS_MS).toISOString()
  const [sharesResult, repositoriesResult, sessionsResult, confirmationsResult, eventsResult, analyticsEventsResult, viewersResult] = await Promise.all([
    admin.from('shares').select('*'),
    admin.from('repositories').select('*'),
    admin.from('viewer_sessions').select('*').gte('confirmed_at', since),
    admin.from('view_events').select('id, created_at').eq('event_type', 'view_confirmed').gte('created_at', since),
    admin.from('view_events').select('id, share_id, session_id, event_type, path, metadata, created_at').order('created_at', { ascending: false }).limit(24),
    admin.from('view_events').select('event_type, path, session_id, created_at').gte('created_at', since),
    admin.from('viewers').select('id, viewer_code'),
  ])

  const queryErrors = [sharesResult.error, repositoriesResult.error, sessionsResult.error, confirmationsResult.error, eventsResult.error, analyticsEventsResult.error, viewersResult.error]
  if (queryErrors.some((error) => error?.code === 'PGRST205')) {
    throw new Error('RepoView database schema is not initialized. Apply the Supabase migrations.')
  }

  if (queryErrors.some(Boolean)) {
    throw new Error('RepoView overview could not be loaded.')
  }

  const shares = sharesResult.data ?? []
  const repositories = repositoriesResult.data ?? []
  const sessions = sessionsResult.data ?? []
  const analyticsEvents = analyticsEventsResult.data ?? []
  const repositoriesById = new Map(repositories.map((repository) => [repository.id, repository]))
  const sharesById = new Map(shares.map((share) => [share.id, share]))
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const viewerCodesById = new Map((viewersResult.data ?? []).map((viewer) => [viewer.id, viewer.viewer_code]))

  return {
    activeShares: shares.filter((share) => {
      const status = getShareStatus(share, repositoriesById.get(share.repository_id) ?? null, now)
      return status === 'active' || status === 'expiring-soon'
    }).length,
    confirmedViews30d: (confirmationsResult.data ?? []).length,
    uniqueConfirmedSessions30d: new Set((sessionsResult.data ?? []).map((session) => session.id)).size,
    totalViews: (confirmationsResult.data ?? []).length,
    uniqueAnonymousViewers: new Set(sessions.map((session) => session.viewer_id ?? session.id)).size,
    returningViewers: countReturningViewers(sessions),
    totalActiveViewingSeconds: Math.round(sessions.reduce((total, session) => total + Number(session.active_ms ?? 0), 0) / 1000),
    filesViewed: new Set(analyticsEvents.filter((event) => event.path && ['file_opened', 'file_viewed', 'markdown_viewed', 'raw_file_viewed', 'image_viewed'].includes(event.event_type)).map((event) => `${event.session_id}:${event.path}`)).size,
    downloads: analyticsEvents.filter((event) => event.event_type === 'download').length,
    copyEvents: analyticsEvents.filter((event) => event.event_type === 'copy').length,
    enabledRepositories: repositories.filter((repository) => repository.enabled).length,
    viewsOverTime: buildViewsOverTime(confirmationsResult.data ?? [], now),
    recentActivity: buildRecentActivity(eventsResult.data ?? [], sessionsById, viewerCodesById, sharesById, repositoriesById),
  }
}

type OverviewEvent = {
  id: number
  share_id: string
  session_id?: string
  event_type: string
  path: string | null
  metadata?: unknown
  created_at: string
}

function buildRecentActivity(
  events: OverviewEvent[],
  sessionsById: Map<string, { id: string; viewer_id?: string | null }>,
  viewerCodesById: Map<string, string>,
  sharesById: Map<string, { id: string; repository_id: string; recipient_label?: string | null }>,
  repositoriesById: Map<string, { github_owner: string; github_repo: string }>,
) {
  const grouped = new Map<string, DashboardOverviewActivity>()

  for (const event of events) {
    const share = sharesById.get(event.share_id)
    if (!share) continue

    const repository = repositoriesById.get(share.repository_id)
    const sessionId = event.session_id ?? `event:${event.id}`
    const session = sessionsById.get(sessionId)
    const viewerKey = session?.viewer_id ?? sessionId
    const groupKey = `${sessionId}:${event.event_type}:${event.path ?? ''}`
    const existing = grouped.get(groupKey)

    if (existing) {
      existing.eventCount += 1
      continue
    }

    grouped.set(groupKey, {
      id: event.id,
      eventType: event.event_type,
      path: event.path,
      sessionId,
      viewerLabel: formatViewerLabel(viewerCodesById.get(session?.viewer_id ?? ''), viewerKey),
      eventCount: 1,
      metadata: isRecord(event.metadata) ? event.metadata : {},
      createdAt: event.created_at,
      recipientLabel: share.recipient_label || 'Generic share',
      repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : 'Repository unavailable',
    })
  }

  return [...grouped.values()].slice(0, 10)
}

function buildViewsOverTime(events: Array<{ created_at?: string }>, now: Date): DashboardOverviewTimePoint[] {
  const dayCount = 7
  const dayMs = 24 * 60 * 60 * 1000
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - dayCount + 1)
  const values = Array.from({ length: dayCount }, () => 0)

  for (const event of events) {
    if (!event.created_at) continue
    const createdAt = new Date(event.created_at)
    const index = Math.floor((createdAt.getTime() - start.getTime()) / dayMs)
    if (index >= 0 && index < dayCount) values[index] += 1
  }

  return values.map((value, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return { label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date), value }
  })
}

function formatViewerLabel(viewerCode: string | undefined, fallback: string) {
  const code = viewerCode || fallback.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || '—'
  return `Anonymous viewer #${code}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function countReturningViewers(sessions: Array<{ id?: string; viewer_id?: string | null; confirmed_at?: string | null }>) {
  const visits = new Map<string, number>()
  for (const session of sessions) {
    if (!session.confirmed_at) continue
    const identity = session.viewer_id ?? `session:${session.id ?? 'unknown'}`
    visits.set(identity, (visits.get(identity) ?? 0) + 1)
  }
  return [...visits.values()].filter((count) => count > 1).length
}
