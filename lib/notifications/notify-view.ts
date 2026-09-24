import 'server-only'

import { getPublicEnv } from '../env/public'
import { getServerEnv } from '../env/server'
import { createSupabaseAdminClient } from '../supabase/admin'
import { buildSessionSummaryEmail, buildViewNotificationEmail } from './view-email'
import { sendSmtpEmail } from './smtp'

type NotifyConfirmedViewerInput = {
  shareId: string
  sessionId: string
  confirmedAt: string
  now?: Date
  share: {
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
    browser_version?: string | null
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
  | { status: 'disabled' | 'probable-bot' | 'already-attempted' }
  | { status: 'sent' | 'failed' }

export async function notifyConfirmedViewer(input: NotifyConfirmedViewerInput): Promise<NotificationResult> {
  if (!input.share.notify_on_view) {
    return { status: 'disabled' }
  }
  if (input.session.is_probable_bot) {
    return { status: 'probable-bot' }
  }

  const admin = createSupabaseAdminClient()
  const attemptedAt = (input.now ?? new Date()).toISOString()
  const { data: claim, error: claimError } = await admin
    .from('viewer_sessions')
    .update({ notified_at: attemptedAt })
    .eq('id', input.sessionId)
    .eq('share_id', input.shareId)
    .is('notified_at', null)
    .select('id')
    .maybeSingle()

  if (claimError) {
    throw claimError
  }
  if (!claim) {
    return { status: 'already-attempted' }
  }

  const visitContext = await getVisitContext(admin, input.shareId, input.sessionId, input.session.viewer_id)
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

  let status: 'sent' | 'failed' = 'sent'
  try {
    const { NOTIFICATION_TO_EMAIL } = getServerEnv()
    await sendSmtpEmail({
      to: NOTIFICATION_TO_EMAIL,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })
  } catch {
    status = 'failed'
  }

  const { error: deliveryError } = await admin.from('notification_deliveries').insert({
    share_id: input.shareId,
    session_id: input.sessionId,
    channel: 'email',
    status,
    notification_kind: 'view_opened',
    payload: { viewer_label: viewerLabel, visit_count: visitContext.visitCount },
    error_text: status === 'failed' ? 'SMTP delivery failed.' : null,
    sent_at: status === 'sent' ? attemptedAt : null,
  })

  if (deliveryError) {
    throw deliveryError
  }

  return { status }
}

export async function notifySessionSummary({ shareId, sessionId, share, repository }: { shareId: string; sessionId: string; share: Record<string, unknown>; repository: Record<string, unknown> }) {
  const admin = createSupabaseAdminClient()
  const { data: session, error: sessionError } = await admin.from('viewer_sessions').select('*').eq('id', sessionId).eq('share_id', shareId).maybeSingle()
  if (sessionError || !session || !session.confirmed_at || session.is_probable_bot) return { status: 'skipped' as const }
  if (share.notify_on_view === false) return { status: 'disabled' as const }

  const endedAt = session.ended_at ?? session.last_seen_at
  const { data: claim, error: claimError } = await admin.from('viewer_sessions')
    .update({ session_summary_notified_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('share_id', shareId)
    .is('session_summary_notified_at', null)
    .select('id')
    .maybeSingle()
  if (claimError) throw claimError
  if (!claim) return { status: 'already-attempted' as const }

  const [{ data: events }, { data: engagement }] = await Promise.all([
    admin.from('view_events').select('event_type, path, created_at').eq('session_id', sessionId).order('created_at', { ascending: true }),
    admin.from('file_engagement').select('path, active_ms, view_count').eq('session_id', sessionId).order('active_ms', { ascending: false }).limit(5),
  ])
  const visitContext = await getVisitContext(admin, shareId, sessionId, session.viewer_id)
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
    duration: formatDuration(Number(session.active_ms ?? 0) + Number(session.idle_ms ?? 0)),
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

  let status: 'sent' | 'failed' = 'sent'
  try {
    const { NOTIFICATION_TO_EMAIL } = getServerEnv()
    await sendSmtpEmail({ to: NOTIFICATION_TO_EMAIL, subject: email.subject, text: email.text, html: email.html })
  } catch {
    status = 'failed'
  }
  const { error: deliveryError } = await admin.from('notification_deliveries').insert({
    share_id: shareId,
    session_id: sessionId,
    channel: 'email',
    notification_kind: 'session_summary',
    status,
    error_text: status === 'failed' ? 'SMTP delivery failed.' : null,
    payload: { viewer_label: visitContext.viewerCode ? `Anonymous Viewer #${visitContext.viewerCode}` : 'Anonymous Viewer', files_viewed: files.length },
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })
  if (deliveryError) throw deliveryError
  return { status }
}

async function getVisitContext(admin: ReturnType<typeof createSupabaseAdminClient>, shareId: string, sessionId: string, viewerId?: string | null) {
  if (!viewerId) return { viewerCode: null, visitCount: 1 }
  void sessionId
  try {
    const [{ data: viewer }, { data: sessions }] = await Promise.all([
      admin.from('viewers').select('viewer_code').eq('id', viewerId).maybeSingle(),
      admin.from('viewer_sessions').select('id').eq('share_id', shareId).eq('viewer_id', viewerId).not('confirmed_at', 'is', null),
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
