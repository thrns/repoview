import 'server-only'

import { requireWorkspace } from '../auth/workspace'
import { createSupabaseServerClient } from '../supabase/server'
import { getShareStatus } from '../shares/dashboard'

export type DashboardRange = '7d' | '30d'

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

export type DashboardSignalPoint = {
  date: string
  label: string
  filesViewed: number
  downloads: number
  copies: number
  uniqueViewers: number
}

export type DashboardTopRepository = {
  repositoryId: string
  repositoryName: string
  owner: string
  name: string
  confirmedViews: number
}

export type DashboardMetricTrend = {
  current: number
  previous: number
  changePercent: number | null
}

export type DashboardOverview = {
  range: DashboardRange
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
  workspaceSignalsOverTime: DashboardSignalPoint[]
  topRepositories: DashboardTopRepository[]
  metricTrends: {
    anonymousViewers: DashboardMetricTrend
    confirmedViews: DashboardMetricTrend
    filesViewed: DashboardMetricTrend
    downloads: DashboardMetricTrend
    copies: DashboardMetricTrend
    uniqueViewers: DashboardMetricTrend
  }
  recentActivity: DashboardOverviewActivity[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const THIRTY_DAYS = 30
const FILE_VIEW_EVENTS = ['file_opened', 'file_viewed', 'markdown_viewed', 'raw_file_viewed', 'image_viewed']

export function normalizeDashboardRange(value?: string | string[]): DashboardRange {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate === '30d' ? '30d' : '7d'
}

export async function getDashboardOverview(now = new Date(), range: DashboardRange = '7d'): Promise<DashboardOverview> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const dayCount = range === '30d' ? 30 : 7
  const currentStart = getPeriodStart(now, dayCount)
  const previousStart = new Date(currentStart.getTime() - dayCount * DAY_MS)
  const legacyThirtyDayStart = getPeriodStart(now, THIRTY_DAYS)
  const historySince = new Date(Math.min(previousStart.getTime(), legacyThirtyDayStart.getTime())).toISOString()
  const selectedSince = currentStart.toISOString()

  const [sharesResult, repositoriesResult, sessionsResult, confirmationsResult, eventsResult, analyticsEventsResult, viewersResult] = await Promise.all([
    supabase.from('shares').select('*').eq('workspace_id', workspace.id),
    supabase.from('repositories').select('*').eq('workspace_id', workspace.id),
    supabase.from('viewer_sessions').select('id, viewer_id, confirmed_at, active_ms').eq('workspace_id', workspace.id).gte('confirmed_at', historySince),
    supabase.from('view_events').select('id, share_id, session_id, created_at').eq('workspace_id', workspace.id).eq('event_type', 'view_confirmed').gte('created_at', historySince),
    supabase.from('view_events').select('id, share_id, session_id, event_type, path, metadata, created_at').eq('workspace_id', workspace.id).gte('created_at', selectedSince).order('created_at', { ascending: false }).limit(24),
    supabase.from('view_events').select('event_type, path, session_id, share_id, created_at').eq('workspace_id', workspace.id).gte('created_at', historySince),
    supabase.from('viewers').select('id, viewer_code').eq('workspace_id', workspace.id),
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
  const confirmations = confirmationsResult.data ?? []
  const recentEvents = eventsResult.data ?? []
  const analyticsEvents = analyticsEventsResult.data ?? []
  const repositoriesById = new Map(repositories.map((repository) => [repository.id, repository]))
  const sharesById = new Map(shares.map((share) => [share.id, share]))
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const viewerCodesById = new Map((viewersResult.data ?? []).map((viewer) => [viewer.id, viewer.viewer_code]))

  const currentConfirmations = filterEventsByWindow(confirmations, currentStart, now, (event) => event.created_at)
  const previousConfirmations = filterEventsByWindow(confirmations, previousStart, currentStart, (event) => event.created_at)
  const currentAnalyticsEvents = filterEventsByWindow(analyticsEvents, currentStart, now, (event) => event.created_at)
  const previousAnalyticsEvents = filterEventsByWindow(analyticsEvents, previousStart, currentStart, (event) => event.created_at)
  const currentSessions = filterSessionsByWindow(sessions, currentStart, now)
  const previousSessions = filterSessionsByWindow(sessions, previousStart, currentStart)

  const currentFilesViewed = countFilesViewed(currentAnalyticsEvents)
  const previousFilesViewed = countFilesViewed(previousAnalyticsEvents)
  const currentDownloads = countEvents(currentAnalyticsEvents, 'download')
  const previousDownloads = countEvents(previousAnalyticsEvents, 'download')
  const currentCopies = countEvents(currentAnalyticsEvents, 'copy')
  const previousCopies = countEvents(previousAnalyticsEvents, 'copy')
  const currentUniqueViewers = countUniqueViewers(currentSessions)
  const previousUniqueViewers = countUniqueViewers(previousSessions)

  return {
    range,
    activeShares: shares.filter((share) => {
      const status = getShareStatus(share, repositoriesById.get(share.repository_id) ?? null, now)
      return status === 'active' || status === 'expiring-soon'
    }).length,
    confirmedViews30d: confirmations.filter((event) => isWithin(event.created_at, legacyThirtyDayStart, now)).length,
    uniqueConfirmedSessions30d: new Set(
      sessions.filter((session) => isWithin(session.confirmed_at, legacyThirtyDayStart, now)).map((session) => session.id),
    ).size,
    totalViews: currentConfirmations.length,
    uniqueAnonymousViewers: currentUniqueViewers,
    returningViewers: countReturningViewers(currentSessions),
    totalActiveViewingSeconds: Math.round(currentSessions.reduce((total, session) => total + Number(session.active_ms ?? 0), 0) / 1000),
    filesViewed: currentFilesViewed,
    downloads: currentDownloads,
    copyEvents: currentCopies,
    enabledRepositories: repositories.filter((repository) => repository.enabled).length,
    viewsOverTime: buildViewsOverTime(currentConfirmations, now, range),
    workspaceSignalsOverTime: buildWorkspaceSignalsOverTime(currentAnalyticsEvents, currentSessions, now, range),
    topRepositories: buildTopRepositories(currentConfirmations, sharesById, repositoriesById),
    metricTrends: {
      anonymousViewers: buildMetricTrend(currentUniqueViewers, previousUniqueViewers),
      confirmedViews: buildMetricTrend(currentConfirmations.length, previousConfirmations.length),
      filesViewed: buildMetricTrend(currentFilesViewed, previousFilesViewed),
      downloads: buildMetricTrend(currentDownloads, previousDownloads),
      copies: buildMetricTrend(currentCopies, previousCopies),
      uniqueViewers: buildMetricTrend(currentUniqueViewers, previousUniqueViewers),
    },
    recentActivity: buildRecentActivity(recentEvents, sessionsById, viewerCodesById, sharesById, repositoriesById),
  }
}

type OverviewEvent = {
  id?: number
  share_id?: string
  session_id?: string
  event_type?: string
  path?: string | null
  metadata?: unknown
  created_at?: string
}

type OverviewSession = {
  id: string
  viewer_id?: string | null
  confirmed_at?: string | null
  active_ms?: number | null
}

function buildRecentActivity(
  events: OverviewEvent[],
  sessionsById: Map<string, OverviewSession>,
  viewerCodesById: Map<string, string>,
  sharesById: Map<string, { id: string; repository_id: string; recipient_label?: string | null }>,
  repositoriesById: Map<string, { github_owner: string; github_repo: string }>,
) {
  const grouped = new Map<string, DashboardOverviewActivity>()

  for (const event of events) {
    if (!event.share_id || !event.event_type) continue
    const share = sharesById.get(event.share_id)
    if (!share) continue

    const repository = repositoriesById.get(share.repository_id)
    const sessionId = event.session_id ?? `event:${event.id ?? 'unknown'}`
    const session = sessionsById.get(sessionId)
    const viewerKey = session?.viewer_id ?? sessionId
    const groupKey = `${sessionId}:${event.event_type}:${event.path ?? ''}`
    const existing = grouped.get(groupKey)

    if (existing) {
      existing.eventCount += 1
      continue
    }

    grouped.set(groupKey, {
      id: event.id ?? 0,
      eventType: event.event_type,
      path: event.path ?? null,
      sessionId,
      viewerLabel: formatViewerLabel(viewerCodesById.get(session?.viewer_id ?? ''), viewerKey),
      eventCount: 1,
      metadata: isRecord(event.metadata) ? event.metadata : {},
      createdAt: event.created_at ?? new Date(0).toISOString(),
      recipientLabel: share.recipient_label || 'Generic share',
      repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : 'Repository unavailable',
    })
  }

  return [...grouped.values()].slice(0, 10)
}

function buildViewsOverTime(events: Array<{ created_at?: string }>, now: Date, range: DashboardRange): DashboardOverviewTimePoint[] {
  const dayCount = range === '30d' ? 30 : 7
  const start = getPeriodStart(now, dayCount)
  const values = Array.from({ length: dayCount }, () => 0)

  for (const event of events) {
    const index = getDayIndex(event.created_at, start, dayCount)
    if (index !== null) values[index] += 1
  }

  return values.map((value, index) => {
    const date = new Date(start.getTime() + index * DAY_MS)
    return { label: formatPeriodLabel(date, range), value }
  })
}

function buildWorkspaceSignalsOverTime(events: OverviewEvent[], sessions: OverviewSession[], now: Date, range: DashboardRange): DashboardSignalPoint[] {
  const dayCount = range === '30d' ? 30 : 7
  const start = getPeriodStart(now, dayCount)
  const fileKeys = Array.from({ length: dayCount }, () => new Set<string>())
  const uniqueViewerKeys = Array.from({ length: dayCount }, () => new Set<string>())
  const downloads = Array.from({ length: dayCount }, () => 0)
  const copies = Array.from({ length: dayCount }, () => 0)

  for (const event of events) {
    const index = getDayIndex(event.created_at, start, dayCount)
    if (index === null) continue
    if (event.event_type === 'download') downloads[index] += 1
    if (event.event_type === 'copy') copies[index] += 1
    if (event.path && event.session_id && FILE_VIEW_EVENTS.includes(event.event_type ?? '')) {
      fileKeys[index].add(`${event.session_id}:${event.path}`)
    }
  }

  for (const session of sessions) {
    const index = getDayIndex(session.confirmed_at ?? undefined, start, dayCount)
    if (index === null) continue
    uniqueViewerKeys[index].add(session.viewer_id ?? `session:${session.id}`)
  }

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start.getTime() + index * DAY_MS)
    return {
      date: date.toISOString(),
      label: formatPeriodLabel(date, range),
      filesViewed: fileKeys[index].size,
      downloads: downloads[index],
      copies: copies[index],
      uniqueViewers: uniqueViewerKeys[index].size,
    }
  })
}

function buildTopRepositories(
  confirmations: OverviewEvent[],
  sharesById: Map<string, { repository_id: string }>,
  repositoriesById: Map<string, { id: string; github_owner: string; github_repo: string }>,
): DashboardTopRepository[] {
  const counts = new Map<string, number>()

  for (const confirmation of confirmations) {
    if (!confirmation.share_id) continue
    const share = sharesById.get(confirmation.share_id)
    if (!share || !repositoriesById.has(share.repository_id)) continue
    counts.set(share.repository_id, (counts.get(share.repository_id) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([repositoryId, confirmedViews]) => {
      const repository = repositoriesById.get(repositoryId)
      if (!repository) return null
      return {
        repositoryId,
        repositoryName: `${repository.github_owner}/${repository.github_repo}`,
        owner: repository.github_owner,
        name: repository.github_repo,
        confirmedViews,
      }
    })
    .filter((repository): repository is DashboardTopRepository => repository !== null)
    .sort((a, b) => b.confirmedViews - a.confirmedViews || a.repositoryName.localeCompare(b.repositoryName))
    .slice(0, 3)
}

function buildMetricTrend(current: number, previous: number): DashboardMetricTrend {
  return {
    current,
    previous,
    changePercent: previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100,
  }
}

function countFilesViewed(events: OverviewEvent[]) {
  return new Set(
    events
      .filter((event) => event.path && event.session_id && FILE_VIEW_EVENTS.includes(event.event_type ?? ''))
      .map((event) => `${event.session_id}:${event.path}`),
  ).size
}

function countEvents(events: OverviewEvent[], eventType: string) {
  return events.filter((event) => event.event_type === eventType).length
}

function countUniqueViewers(sessions: OverviewSession[]) {
  return new Set(sessions.map((session) => session.viewer_id ?? session.id)).size
}

function filterEventsByWindow<T>(events: T[], start: Date, end: Date, getCreatedAt: (event: T) => string | undefined) {
  return events.filter((event) => isWithin(getCreatedAt(event), start, end))
}

function filterSessionsByWindow(sessions: OverviewSession[], start: Date, end: Date) {
  return sessions.filter((session) => isWithin(session.confirmed_at, start, end))
}

function isWithin(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp >= start.getTime() && timestamp <= end.getTime()
}

function getPeriodStart(now: Date, dayCount: number) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - dayCount + 1)
  return start
}

function getDayIndex(value: string | undefined, start: Date, dayCount: number) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return null
  const index = Math.floor((timestamp - start.getTime()) / DAY_MS)
  return index >= 0 && index < dayCount ? index : null
}

function formatPeriodLabel(date: Date, range: DashboardRange) {
  return new Intl.DateTimeFormat('en', range === '7d' ? { weekday: 'short' } : { month: 'short', day: 'numeric' }).format(date)
}

function formatViewerLabel(viewerCode: string | undefined, fallback: string) {
  const code = viewerCode || fallback.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase() || '—'
  return `Anonymous viewer #${code}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function countReturningViewers(sessions: Array<{ id?: string; viewer_id?: string | null }>) {
  const visits = new Map<string, number>()
  for (const session of sessions) {
    const identity = session.viewer_id ?? `session:${session.id ?? 'unknown'}`
    visits.set(identity, (visits.get(identity) ?? 0) + 1)
  }
  return [...visits.values()].filter((count) => count > 1).length
}
