import 'server-only'

import { requireWorkspace } from '@/lib/auth/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export type ViewerDashboardItem = {
  viewerId: string
  viewerCode: string
  displayName: string
  recipientLabel: string | null
  company: string | null
  repositoryName?: string | null
  verified: false
  visits: number
  totalViewingSeconds: number
  filesViewed: number
  lastSeenAt: string | null
  location: string | null
  deviceContext?: string | null
}

export type ViewerSessionDetail = {
  id: string
  shareId: string
  shareLabel: string
  company: string | null
  repositoryName: string
  ref: string
  commitSha: string | null
  firstSeenAt: string
  lastSeenAt: string
  endedAt: string | null
  activeSeconds: number
  idleSeconds: number
  firstFile: string | null
  lastFile: string | null
  files: string[]
  entryPath: string | null
  exitPath: string | null
  referrer: string | null
  location: { city: string | null; region: string | null; country: string | null; timezone: string | null; latitude: number | null; longitude: number | null }
  device: Record<string, string | number | boolean | null>
  network: Record<string, string | number | boolean | null>
  security: Json
}

export type ViewerDetailData = {
  viewer: { id: string; code: string; firstSeenAt: string; lastSeenAt: string }
  summary: ViewerDashboardItem
  sessions: ViewerSessionDetail[]
  activity: Array<{ id: number; sessionId: string; eventType: string; path: string | null; metadata: Json; createdAt: string }>
  timeline: Array<{ id: string; eventType: string; path: string | null; occurredAt: string; sessionId: string }>
}

export async function listViewerDashboardItems(): Promise<ViewerDashboardItem[]> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const [{ data: viewers, error: viewersError }, { data: sessions, error: sessionsError }, { data: shares, error: sharesError }, { data: recipients, error: recipientsError }, { data: repositories, error: repositoriesError }, { data: engagement, error: engagementError }] = await Promise.all([
    supabase.from('viewers').select('*').eq('workspace_id', workspace.id).order('last_seen_at', { ascending: false }),
    supabase.from('viewer_sessions').select('*').eq('workspace_id', workspace.id).not('confirmed_at', 'is', null),
    supabase.from('shares').select('*').eq('workspace_id', workspace.id),
    supabase.from('share_recipients').select('*').eq('workspace_id', workspace.id),
    supabase.from('repositories').select('*').eq('workspace_id', workspace.id),
    supabase.from('file_engagement').select('viewer_id, path, active_ms').eq('workspace_id', workspace.id),
  ])
  if (viewersError || sessionsError || sharesError || recipientsError || repositoriesError || engagementError) throw new Error('RepoView viewers could not be loaded.')

  const sharesById = new Map((shares ?? []).map((share) => [share.id, share]))
  const recipientsByShare = new Map((recipients ?? []).map((recipient) => [recipient.share_id, recipient]))
  const repositoriesById = new Map((repositories ?? []).map((repository) => [repository.id, repository]))
  const sessionsByViewer = new Map<string, typeof sessions>()
  for (const session of sessions ?? []) {
    if (!session.viewer_id) continue
    sessionsByViewer.set(session.viewer_id, [...(sessionsByViewer.get(session.viewer_id) ?? []), session])
  }
  const filesByViewer = new Map<string, Set<string>>()
  for (const file of engagement ?? []) {
    if (!file.viewer_id) continue
    const files = filesByViewer.get(file.viewer_id) ?? new Set<string>()
    files.add(file.path)
    filesByViewer.set(file.viewer_id, files)
  }

  return (viewers ?? []).map((viewer) => {
    const viewerSessions = sessionsByViewer.get(viewer.id) ?? []
    const latest = [...viewerSessions].sort((left, right) => new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime())[0]
    const share = latest ? sharesById.get(latest.share_id) : undefined
    const recipient = share ? recipientsByShare.get(share.id) : undefined
    const repository = share ? repositoriesById.get(share.repository_id) : undefined
    return {
      viewerId: viewer.id,
      viewerCode: viewer.viewer_code,
      displayName: formatViewerName(viewer.viewer_code),
      recipientLabel: recipient?.recipient_name || share?.recipient_label || null,
      company: recipient?.company ?? null,
      repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : null,
      verified: false as const,
      visits: viewerSessions.length,
      totalViewingSeconds: Math.round(viewerSessions.reduce((total, session) => total + Number(session.active_ms ?? 0), 0) / 1000),
      filesViewed: filesByViewer.get(viewer.id)?.size ?? 0,
      lastSeenAt: latest?.last_seen_at ?? viewer.last_seen_at,
      location: latest ? formatLocation(latest.city, latest.region, latest.country) : repository ? 'Not available' : null,
      deviceContext: latest ? formatDeviceContext(latest.browser, latest.os, latest.device_type) : null,
    }
  })
}

export async function getViewerDetail(viewerId: string): Promise<ViewerDetailData> {
  const { workspace } = await requireWorkspace()
  const supabase = await createSupabaseServerClient()
  const { data: viewer, error: viewerError } = await supabase.from('viewers').select('*').eq('id', viewerId).eq('workspace_id', workspace.id).maybeSingle()
  if (viewerError || !viewer) throw new Error('Viewer not found.')
  const [{ data: sessions, error: sessionsError }, { data: shares, error: sharesError }, { data: recipients, error: recipientsError }, { data: repositories, error: repositoriesError }, { data: events, error: eventsError }, { data: engagements, error: engagementError }] = await Promise.all([
    supabase.from('viewer_sessions').select('*').eq('viewer_id', viewerId).eq('workspace_id', workspace.id).order('first_seen_at', { ascending: false }),
    supabase.from('shares').select('*').eq('workspace_id', workspace.id),
    supabase.from('share_recipients').select('*').eq('workspace_id', workspace.id),
    supabase.from('repositories').select('*').eq('workspace_id', workspace.id),
    supabase.from('view_events').select('*').eq('workspace_id', workspace.id).in('session_id', await getSessionIds(supabase, viewerId, workspace.id)).order('created_at', { ascending: true }),
    supabase.from('file_engagement').select('*').eq('viewer_id', viewerId).eq('workspace_id', workspace.id).order('last_viewed_at', { ascending: false }),
  ])
  if (sessionsError || sharesError || recipientsError || repositoriesError || eventsError || engagementError) throw new Error('Viewer detail could not be loaded.')

  const shareMap = new Map((shares ?? []).map((share) => [share.id, share]))
  const recipientMap = new Map((recipients ?? []).map((recipient) => [recipient.share_id, recipient]))
  const repositoryMap = new Map((repositories ?? []).map((repository) => [repository.id, repository]))
  const filesBySession = new Map<string, string[]>()
  const orderedEngagements = [...(engagements ?? [])].sort((left, right) => {
    const leftOrder = left.first_view_order ?? Number.MAX_SAFE_INTEGER
    const rightOrder = right.first_view_order ?? Number.MAX_SAFE_INTEGER
    return leftOrder - rightOrder || new Date(left.first_viewed_at).getTime() - new Date(right.first_viewed_at).getTime()
  })
  for (const engagement of orderedEngagements) filesBySession.set(engagement.session_id, [...(filesBySession.get(engagement.session_id) ?? []), engagement.path])
  const detailSessions = (sessions ?? []).map((session) => {
    const share = shareMap.get(session.share_id)
    const recipient = recipientMap.get(session.share_id)
    const repository = share ? repositoryMap.get(share.repository_id) : undefined
    const paths = filesBySession.get(session.id) ?? []
    return {
      id: session.id,
      shareId: session.share_id,
      shareLabel: recipient?.recipient_name || share?.recipient_label || 'Generic share',
      company: recipient?.company ?? null,
      repositoryName: repository ? `${repository.github_owner}/${repository.github_repo}` : 'Repository unavailable',
      ref: share?.ref ?? 'Unknown ref',
      commitSha: share?.commit_sha ?? null,
      firstSeenAt: session.first_seen_at,
      lastSeenAt: session.last_seen_at,
      endedAt: session.ended_at,
      activeSeconds: Math.round(Number(session.active_ms ?? 0) / 1000),
      idleSeconds: Math.round(Number(session.idle_ms ?? 0) / 1000),
      firstFile: paths[0] ?? null,
      lastFile: paths.at(-1) ?? null,
      files: [...new Set(paths)],
      entryPath: session.entry_path,
      exitPath: session.exit_path,
      referrer: session.referrer_url || session.referrer_host,
      location: { city: session.city, region: session.region, country: session.country, timezone: session.timezone, latitude: session.approximate_latitude, longitude: session.approximate_longitude },
      device: { type: session.device_type, browser: session.browser, browserVersion: session.browser_version, engine: session.rendering_engine, os: session.os, osVersion: session.os_version, architecture: session.architecture, language: session.primary_language, timezone: session.browser_timezone, screen: session.screen_width && session.screen_height ? `${session.screen_width}×${session.screen_height}` : null, viewport: session.viewport_width && session.viewport_height ? `${session.viewport_width}×${session.viewport_height}` : null, pixelRatio: session.pixel_ratio, orientation: session.orientation, touch: session.touch_capable, darkMode: session.dark_mode, reducedMotion: session.reduced_motion },
      network: { ip: session.public_ip, ipVersion: session.ip_version, asn: session.asn, asnOrganization: session.asn_organization, isp: session.isp_organization, classification: session.network_classification, vpn: session.vpn_indication, proxy: session.proxy_indication, tor: session.tor_indication, datacenter: session.datacenter_indication, protocol: session.http_protocol },
      security: session.security_signals,
    }
  })
  const summary = buildSummary(viewer, detailSessions)
  return {
    viewer: { id: viewer.id, code: viewer.viewer_code, firstSeenAt: viewer.first_seen_at, lastSeenAt: viewer.last_seen_at },
    summary,
    sessions: detailSessions,
    activity: (events ?? []).map((event) => ({ id: event.id, sessionId: event.session_id, eventType: event.event_type, path: event.path, metadata: event.metadata, createdAt: event.created_at })),
    timeline: (events ?? []).map((event) => ({ id: `event-${event.id}`, eventType: event.event_type, path: event.path, occurredAt: event.created_at, sessionId: event.session_id })),
  }
}

async function getSessionIds(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, viewerId: string, workspaceId: string) {
  const { data } = await supabase.from('viewer_sessions').select('id').eq('viewer_id', viewerId).eq('workspace_id', workspaceId)
  return (data ?? []).map((row) => row.id)
}

function buildSummary(viewer: { id: string; viewer_code: string; last_seen_at: string }, sessions: ViewerSessionDetail[]): ViewerDashboardItem {
  const latest = sessions[0]
  const paths = new Set(sessions.flatMap((session) => session.files))
  return { viewerId: viewer.id, viewerCode: viewer.viewer_code, displayName: formatViewerName(viewer.viewer_code), recipientLabel: latest?.shareLabel ?? null, company: latest?.company ?? null, repositoryName: latest?.repositoryName ?? null, verified: false, visits: sessions.length, totalViewingSeconds: sessions.reduce((total, session) => total + session.activeSeconds, 0), filesViewed: paths.size, lastSeenAt: latest?.lastSeenAt ?? viewer.last_seen_at, location: latest ? formatLocation(latest.location.city, latest.location.region, latest.location.country) : null, deviceContext: latest ? formatDeviceContext(stringValue(latest.device.browser), stringValue(latest.device.os), stringValue(latest.device.type)) : null }
}

function formatViewerName(code: string) {
  return `Anonymous Viewer #${code}`
}

function formatDeviceContext(browser: string | null | undefined, os: string | null | undefined, deviceType: string | null | undefined) {
  return [browser, os].filter(Boolean).join(' · ') || deviceType || 'Context not available'
}

function stringValue(value: string | number | boolean | null | undefined) {
  return typeof value === 'string' ? value : null
}

function formatLocation(city: string | null | undefined, region: string | null | undefined, country: string | null | undefined) {
  return [city, region, country].filter(Boolean).join(', ') || 'Not available'
}
