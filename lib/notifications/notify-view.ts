import 'server-only'

import { getPublicEnv } from '../env/public'
import { createSupabaseAdminClient } from '../supabase/admin'
import { buildSessionSummaryEmail, buildViewNotificationEmail } from './view-email'
import { queueNotificationDelivery } from './delivery'

type NotifyConfirmedViewerInput = {
  shareId: string
  sessionId: string
  confirmedAt: string
  now?: Date
  share: {
    workspace_id: string
    recipient_label: string | null
    ref: string
    notify_on_view: boolean
    share_type?: 'generic' | 'recipient'
  }
  repository: {
    github_owner: string
    github_repo: string
  }
  session: {
    browser: string | null
    os: string | null
    device_type: string | null
    country: string | null
    city?: string | null
    region?: string | null
    referrer_host?: string | null
    is_probable_bot: boolean
    viewer_id?: string | null
  }
}

export type NotificationResult =
  | { status: 'disabled' | 'probable-bot' | 'already-attempted' | 'unconfigured' }
  | { status: 'queued'; deliveryId: string }
  | { status: 'quota-exceeded'; message: string }

export async function notifyConfirmedViewer(input: NotifyConfirmedViewerInput): Promise<NotificationResult> {
  if (!input.share.notify_on_view) {
    return { status: 'disabled' }
  }
  if (input.session.is_probable_bot) {
    return { status: 'probable-bot' }
  }

  const admin = createSupabaseAdminClient()
  const notificationSettings = await getNotificationSettings(admin, input.share.workspace_id)
  if (notificationSettings && !notificationSettings.view_opened) {
    return { status: 'disabled' }
  }
  if (!notificationSettings?.destination_email || !notificationSettings.email_verified) {
    return { status: 'unconfigured' }
  }
  const visitContext = await getVisitContext(admin, input.shareId, input.sessionId, input.session.viewer_id, input.share.workspace_id)
  if (visitContext.visitCount > 1 && !notificationSettings.returning_view) {
    return { status: 'disabled' }
  }
  const viewerLabel = visitContext.viewerCode ? `Anonymous Viewer #${visitContext.viewerCode}` : input.share.recipient_label ?? 'Anonymous Viewer'
  const email = buildViewNotificationEmail({
    recipientLabel: input.share.recipient_label,
    viewerLabel,
    visitLabel: visitContext.visitCount > 1 ? `Returning visit · ${visitContext.visitCount} visits` : 'First visit',
    repositoryName: `${input.repository.github_owner}/${input.repository.github_repo}`,
    ref: input.share.ref,
    confirmedAt: input.confirmedAt,
    browser: input.session.browser,
    os: input.session.os,
    deviceType: input.session.device_type,
    country: input.session.country,
    city: input.session.city,
    region: input.session.region,
    referrer: input.session.referrer_host,
    shareId: input.shareId,
    appUrl: getPublicEnv().NEXT_PUBLIC_APP_URL,
  })

  const queued = await queueNotificationDelivery(admin, {
    workspaceId: input.share.workspace_id,
    shareId: input.shareId,
    sessionId: input.sessionId,
    recipient: notificationSettings.destination_email,
    notificationKind: 'view_opened',
    idempotencyKey: `view_opened:${input.sessionId}`,
    email: {
      to: notificationSettings.destination_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    },
    payload: { viewer_label: viewerLabel, visit_count: visitContext.visitCount },
  })
  if (queued.status === 'queued' || queued.status === 'quota-exceeded') return queued
  return { status: 'already-attempted' }
}

export async function notifySessionSummary({ shareId, sessionId, share, repository }: { shareId: string; sessionId: string; share: Record<string, unknown>; repository: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient()
  const workspaceId = typeof share.workspace_id === 'string' ? share.workspace_id : undefined
  if (!workspaceId) return { status: 'skipped' as const }
  const notificationSettings = await getNotificationSettings(admin, workspaceId)
  const sessionQuery = admin.from('viewer_sessions').select('*').eq('id', sessionId).eq('share_id', shareId)
  const { data: session, error: sessionError } = await sessionQuery.eq('workspace_id', workspaceId).maybeSingle()
  if (sessionError || !session || !session.confirmed_at || session.is_probable_bot) return { status: 'skipped' as const }
  if (share.notify_on_view === false) return { status: 'disabled' as const }
  if (notificationSettings && !notificationSettings.session_summary) return { status: 'disabled' as const }
  if (!notificationSettings?.destination_email || !notificationSettings.email_verified) return { status: 'unconfigured' as const }

  const endedAt = session.ended_at ?? session.last_seen_at

  const [{ data: events }, { data: engagement }] = await Promise.all([
    admin.from('view_events').select('event_type, path, created_at').eq('session_id', sessionId).eq('workspace_id', workspaceId).order('created_at', { ascending: true }),
    admin.from('file_engagement').select('path, active_ms, view_count').eq('session_id', sessionId).eq('workspace_id', workspaceId).order('active_ms', { ascending: false }).limit(5),
  ])
  const visitContext = await getVisitContext(admin, shareId, sessionId, session.viewer_id, workspaceId)
  const fileEvents = (events ?? []).filter((event) => event.path && ['file_opened', 'file_viewed', 'markdown_viewed', 'raw_file_viewed', 'image_viewed'].includes(event.event_type))
  const files = [...new Set(fileEvents.map((event) => event.path as string))]
  const directories = new Set((events ?? []).filter((event) => event.event_type === 'directory_opened' || event.event_type === 'directory_viewed').map((event) => event.path).filter(Boolean))
  const repositoryName = `${String(repository.github_owner ?? '')}/${String(repository.github_repo ?? '')}`
  const email = buildSessionSummaryEmail({
    recipientLabel: typeof share.recipient_label === 'string' ? share.recipient_label : null,
    viewerLabel: visitContext.viewerCode ? `Anonymous Viewer #${visitContext.viewerCode}` : 'Anonymous Viewer',
    visitLabel: visitContext.visitCount > 1 ? `Returning visit · ${visitContext.visitCount} visits` : 'First visit',
    repositoryName,
    ref: String(share.ref ?? 'unknown ref'),
    endedAt,
    duration: formatDuration(Number(session.active_ms ?? 0)),
    filesViewed: files.length,
    directoriesViewed: directories.size,
    searches: (events ?? []).filter((event) => event.event_type === 'search').length,
    copies: (events ?? []).filter((event) => event.event_type === 'copy').length,
    downloads: (events ?? []).filter((event) => event.event_type === 'download').length,
    topFiles: (engagement ?? []).map((file) => file.path),
    firstFile: files[0] ?? null,
    lastFile: files.at(-1) ?? null,
    securityAlerts: getSecurityAlerts(session.security_signals),
    shareId,
    appUrl: getPublicEnv().NEXT_PUBLIC_APP_URL,
  })

  const queued = await queueNotificationDelivery(admin, {
    workspaceId,
    shareId,
    sessionId,
    recipient: notificationSettings.destination_email,
    notificationKind: 'session_summary',
    idempotencyKey: `session_summary:${sessionId}`,
    email: {
      to: notificationSettings.destination_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    },
    payload: { viewer_label: visitContext.viewerCode ? `Anonymous Viewer #${visitContext.viewerCode}` : 'Anonymous Viewer', files_viewed: files.length },
  })
  if (queued.status === 'queued' || queued.status === 'quota-exceeded') return queued
  return { status: 'already-attempted' as const }
}

async function getNotificationSettings(admin: ReturnType<typeof createSupabaseAdminClient>, workspaceId: string) {
  const { data, error } = await admin
    .from('notification_settings')
    .select('destination_email, email_verified, view_opened, returning_view, session_summary')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function getVisitContext(admin: ReturnType<typeof createSupabaseAdminClient>, shareId: string, sessionId: string, viewerId: string | null | undefined, workspaceId: string) {
  if (!viewerId) return { viewerCode: null, visitCount: 1 }
  void sessionId
  try {
    const [{ data: viewer }, { data: sessions }] = await Promise.all([
      admin.from('viewers').select('viewer_code').eq('id', viewerId).eq('workspace_id', workspaceId).maybeSingle(),
      admin.from('viewer_sessions').select('id').eq('share_id', shareId).eq('workspace_id', workspaceId).eq('viewer_id', viewerId).not('confirmed_at', 'is', null),
    ])
    return { viewerCode: viewer?.viewer_code ?? null, visitCount: sessions?.length ?? 1 }
  } catch {
    return { viewerCode: null, visitCount: 1 }
  }
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function getSecurityAlerts(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const signals = value as Record<string, unknown>
  return [
    signals.possible_link_forwarding ? 'Possible link forwarding' : null,
    signals.automation ? 'Automation/headless signal' : null,
    signals.vpn || signals.proxy || signals.tor || signals.datacenter ? 'Network anonymity/hosting signal' : null,
  ].filter((value): value is string => Boolean(value))
}
