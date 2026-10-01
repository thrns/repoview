export type ViewNotificationEmailInput = {
  recipientLabel: string | null
  viewerLabel?: string | null
  visitLabel?: string | null
  repositoryName: string
  ref: string
  confirmedAt: string
  entryPath?: string | null
  browser: string | null
  os: string | null
  deviceType: string | null
  country: string | null
  city?: string | null
  region?: string | null
  referrer?: string | null
  isProbableBot?: boolean
  vpnIndication?: boolean | null
  proxyIndication?: boolean | null
  torIndication?: boolean | null
  datacenterIndication?: boolean | null
  securitySignals?: unknown
  shareId: string
  appUrl: string
}

export type ViewNotificationEmail = {
  subject: string
  text: string
  html: string
}

const EMAIL_THEME = {
  canvas: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F4F4F5',
  foreground: '#09090B',
  foregroundLight: '#3F3F46',
  foregroundMuted: '#71717A',
  border: '#E4E4E7',
  borderSecondary: '#ECECEE',
  brandText: '#157F3C',
  brandFill: '#34B27B',
  brandForeground: '#171717',
  warningSurface: '#FFF8EB',
  warningBorder: '#F3D7A6',
  warningForeground: '#8A5A00',
} as const

export function buildViewNotificationEmail(input: ViewNotificationEmailInput): ViewNotificationEmail {
  const recipientLabel = cleanText(input.recipientLabel ?? 'Generic share', 'Generic share')
  const viewerLabel = cleanText(input.viewerLabel ?? recipientLabel, recipientLabel)
  const visitLabel = cleanText(input.visitLabel ?? 'First visit', 'First visit')
  const repositoryName = cleanText(input.repositoryName, 'repository')
  const ref = cleanText(input.ref, 'unknown ref')
  const viewedAt = formatDate(input.confirmedAt)
  const browser = input.browser || 'Not available'
  const os = input.os || 'Not available'
  const device = formatDevice(input.deviceType)
  const location = formatLocation(input.city, input.region, input.country)
  const referrer = input.referrer || 'Not available'
  const entryPath = input.entryPath || 'Not available'
  const securityContext = formatSecurityContext(input)
  const activityUrl = new URL(`/dashboard/shares/${encodeURIComponent(input.shareId)}`, input.appUrl).toString()
  const logoUrl = new URL('/repoview-logo-light.svg', input.appUrl).toString()
  const subject = `RepoView: ${cleanSubject(viewerLabel)} viewed ${cleanSubject(repositoryName)}`
  const lines = [
    'RepoView',
    '',
    'A confirmed browser session viewed your private source share.',
    '',
    `Viewer: ${viewerLabel}`,
    `Share: ${recipientLabel}`,
    `Visit: ${visitLabel}`,
    `Repository: ${repositoryName}`,
    `Ref: ${ref}`,
    `Viewed: ${viewedAt}`,
    `Entry path: ${entryPath}`,
    `Browser: ${browser}`,
    `OS: ${os}`,
    `Device: ${device}`,
    `Approx. location: ${location}`,
    `Referrer host: ${referrer}`,
    `Security/context (inferred): ${securityContext}`,
    '',
    `View activity: ${activityUrl}`,
  ]

  return {
    subject,
    text: lines.join('\n'),
    html: buildViewHtml({ recipientLabel, viewerLabel, visitLabel, repositoryName, ref, viewedAt: formatEmailDate(input.confirmedAt), entryPath, browser, os, device, location, referrer, securityContext, activityUrl, logoUrl }),
  }
}

export type SessionSummaryEmailInput = {
  recipientLabel: string | null
  viewerLabel: string
  visitLabel: string
  repositoryName: string
  ref: string
  endedAt: string
  duration: string
  filesViewed: number
  directoriesViewed: number
  searches: number
  copies: number
  downloads: number
  topFiles: string[]
  firstFile: string | null
  lastFile: string | null
  securityAlerts: string[]
  shareId: string
  appUrl: string
}

export function buildSessionSummaryEmail(input: SessionSummaryEmailInput): ViewNotificationEmail {
  const viewerLabel = cleanText(input.viewerLabel, 'Anonymous Viewer')
  const repositoryName = cleanText(input.repositoryName, 'repository')
  const activityUrl = new URL(`/dashboard/shares/${encodeURIComponent(input.shareId)}`, input.appUrl).toString()
  const logoUrl = new URL('/repoview-logo-light.svg', input.appUrl).toString()
  const lines = [
    'RepoView', '', 'A viewer session ended.', '',
    `Viewer: ${viewerLabel}`,
    `Share: ${cleanText(input.recipientLabel || 'Generic share', 'Generic share')}`,
    `Visit: ${cleanText(input.visitLabel, 'Visit')}`,
    `Repository: ${repositoryName}`,
    `Ref: ${cleanText(input.ref, 'unknown ref')}`,
    `Duration: ${cleanText(input.duration, 'Unknown')}`,
    `Files viewed: ${input.filesViewed}`,
    `Directories viewed: ${input.directoriesViewed}`,
    `Searches: ${input.searches}`,
    `Copies: ${input.copies}`,
    `Downloads: ${input.downloads}`,
    `First file: ${input.firstFile || 'None recorded'}`,
    `Last file: ${input.lastFile || 'None recorded'}`,
    `Top files by dwell: ${input.topFiles.length > 0 ? input.topFiles.join(', ') : 'None recorded'}`,
    ...(input.securityAlerts.length > 0 ? ['', `Security: ${input.securityAlerts.join('; ')}`] : []),
    '', `Session ended: ${formatDate(input.endedAt)}`, `View activity: ${activityUrl}`,
  ]
  return {
    subject: `RepoView: ${cleanSubject(viewerLabel)} session summary for ${cleanSubject(repositoryName)}`,
    text: lines.join('\n'),
    html: buildSessionSummaryHtml({
      recipientLabel: cleanText(input.recipientLabel || 'Generic share', 'Generic share'),
      viewerLabel,
      visitLabel: cleanText(input.visitLabel, 'Visit'),
      repositoryName,
      ref: cleanText(input.ref, 'unknown ref'),
      endedAt: formatEmailDate(input.endedAt),
      duration: cleanText(input.duration, 'Unknown'),
      filesViewed: input.filesViewed,
      directoriesViewed: input.directoriesViewed,
      searches: input.searches,
      copies: input.copies,
      downloads: input.downloads,
      topFiles: input.topFiles,
      firstFile: input.firstFile,
      lastFile: input.lastFile,
      securityAlerts: input.securityAlerts,
      activityUrl,
      logoUrl,
    }),
  }
}

function buildViewHtml(values: {
  recipientLabel: string
  viewerLabel: string
  visitLabel: string
  repositoryName: string
  ref: string
  viewedAt: string
  entryPath: string
  browser: string
  os: string
  device: string
  location: string
  referrer: string
  securityContext: string
  activityUrl: string
  logoUrl: string
}) {
  const securityAlerts = values.securityContext.split('; ').filter((signal) => signal.endsWith('Yes (inferred)'))
  const securityBlock = securityAlerts.length > 0
    ? warningPanel('Inferred security signals', securityAlerts)
    : `<p style="margin:0;color:${EMAIL_THEME.foregroundMuted};font-size:12px;line-height:18px">No unusual signals detected</p>`
  const details = detailsTable([
    { label: 'Viewer', value: values.viewerLabel },
    { label: 'Viewed', value: values.viewedAt },
    { label: 'Entry path', value: values.entryPath, monospace: true },
    { label: 'Browser', value: values.browser },
    { label: 'Device', value: `${values.os} · ${values.device}` },
    { label: 'Approx. location', value: values.location },
    { label: 'Referrer', value: values.referrer },
  ])

  return emailShell({
    preheader: `${values.viewerLabel} viewed ${values.repositoryName}`,
    pageTitle: 'View notification',
    eyebrow: formatViewVisitLabel(values.visitLabel),
    title: 'Repository viewed',
    intro: 'Someone opened your private repository share.',
    content: [
      repositoryPanel(values.repositoryName, values.ref, values.recipientLabel),
      section('View details', details),
      section('Security context', securityBlock),
    ].join(''),
    activityUrl: values.activityUrl,
    ctaLabel: 'View activity',
    logoUrl: values.logoUrl,
  })
}

function buildSessionSummaryHtml(input: {
  recipientLabel: string
  viewerLabel: string
  visitLabel: string
  repositoryName: string
  ref: string
  endedAt: string
  duration: string
  filesViewed: number
  directoriesViewed: number
  searches: number
  copies: number
  downloads: number
  topFiles: string[]
  firstFile: string | null
  lastFile: string | null
  securityAlerts: string[]
  activityUrl: string
  logoUrl: string
}) {
  const topFiles = input.topFiles.map((file) => cleanText(file, 'Unknown file')).slice(0, 5)
  const filesContent = topFiles.length > 0
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${topFiles.map((file, index) => `<tr><td style="padding:${index === 0 ? '0' : '5px'} 0 0;color:${EMAIL_THEME.foregroundLight};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:18px;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(file)}</td></tr>`).join('')}</table>`
    : `<p style="margin:0;color:${EMAIL_THEME.foregroundMuted};font-size:12px;line-height:18px">None recorded</p>`
  const filesPanel = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0"><tr><td style="padding:12px 14px;border:1px solid ${EMAIL_THEME.border};border-radius:8px;background:${EMAIL_THEME.surfaceSecondary}">${filesContent}</td></tr></table>`
  const securityContent = input.securityAlerts.length > 0
    ? warningPanel('Inferred security signals', input.securityAlerts)
    : ''
  const metrics = metricsTable([
    { label: 'Duration', value: input.duration },
    { label: 'Files viewed', value: input.filesViewed },
    { label: 'Directories', value: input.directoriesViewed },
    { label: 'Searches', value: input.searches },
  ])

  return emailShell({
    preheader: `${input.viewerLabel} session summary for ${input.repositoryName}`,
    pageTitle: 'Session summary',
    eyebrow: formatSessionVisitLabel(input.visitLabel),
    title: 'Session complete',
    intro: `Viewing activity for ${input.repositoryName} has ended.`,
    content: [
      repositoryPanel(input.repositoryName, input.ref, input.recipientLabel),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="padding-top:20px">${metrics}</td></tr></table>`,
      section('Session details', detailsTable([
        { label: 'Copies', value: String(input.copies) },
        { label: 'Downloads', value: String(input.downloads) },
        { label: 'First file', value: input.firstFile || 'None recorded', monospace: true },
        { label: 'Last file', value: input.lastFile || 'None recorded', monospace: true },
        { label: 'Session ended', value: input.endedAt },
      ])),
      section('Top files by dwell', filesPanel),
      securityContent ? section('Security context', securityContent) : '',
    ].join(''),
    activityUrl: input.activityUrl,
    ctaLabel: 'Open viewer analytics',
    logoUrl: input.logoUrl,
  })
}

function emailShell(input: { preheader: string; pageTitle: string; eyebrow: string; title: string; intro: string; content: string; activityUrl: string; ctaLabel: string; logoUrl: string }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RepoView</title></head>',
    `<body style="margin:0;padding:0;background:${EMAIL_THEME.canvas};color:${EMAIL_THEME.foreground};font-family:Inter,-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Arial,sans-serif;-webkit-font-smoothing:antialiased">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${EMAIL_THEME.canvas}">`,
    '<tr><td align="center" style="padding:24px 16px">',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background:${EMAIL_THEME.surface};border:1px solid ${EMAIL_THEME.border};border-radius:8px;overflow:hidden">`,
    `<tr><td style="padding:16px 22px;border-bottom:1px solid ${EMAIL_THEME.borderSecondary};background:${EMAIL_THEME.surface}">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>',
    '<td style="vertical-align:middle">',
    '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>',
    `<td style="vertical-align:middle"><img src="${escapeHtml(input.logoUrl)}" width="24" height="24" alt="RepoView" style="display:block;width:24px;height:24px"></td>`,
    `<td style="padding-left:8px;color:${EMAIL_THEME.foreground};font-size:14px;font-weight:600;line-height:20px;white-space:nowrap">RepoView</td>`,
    `<td style="padding:0 7px;color:${EMAIL_THEME.foregroundMuted};font-size:13px;line-height:20px">/</td>`,
    `<td style="color:${EMAIL_THEME.foregroundMuted};font-size:13px;font-weight:450;line-height:20px">${escapeHtml(input.pageTitle)}</td>`,
    '</tr></table>',
    '</td>',
    `<td align="right" style="padding-left:8px;vertical-align:middle;white-space:nowrap"><span style="display:inline-block;border:1px solid ${EMAIL_THEME.border};border-radius:6px;background:${EMAIL_THEME.surfaceSecondary};padding:3px 7px;color:${EMAIL_THEME.foregroundLight};font-size:10px;font-weight:600;line-height:14px">PRIVATE SHARE</span></td>`,
    '</tr></table>',
    '</td></tr>',
    `<tr><td style="padding:28px 28px 24px;background:${EMAIL_THEME.surface}">`,
    `<p style="margin:0;color:${EMAIL_THEME.brandText};font-size:11px;font-weight:600;letter-spacing:.055em;line-height:16px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p>`,
    `<h1 style="margin:7px 0 0;color:${EMAIL_THEME.foreground};font-size:24px;font-weight:600;letter-spacing:-.025em;line-height:30px">${escapeHtml(input.title)}</h1>`,
    `<p style="margin:6px 0 0;color:${EMAIL_THEME.foregroundMuted};font-size:14px;line-height:21px">${escapeHtml(input.intro)}</p>`,
    input.content,
    `<p style="margin:24px 0 0"><a href="${escapeHtml(input.activityUrl)}" style="display:inline-block;padding:9px 14px;border-radius:6px;background:${EMAIL_THEME.brandFill};color:${EMAIL_THEME.brandForeground};font-size:13px;font-weight:600;line-height:18px;text-decoration:none">${escapeHtml(input.ctaLabel)} <span style="font-size:13px">→</span></a></p>`,
    '</td></tr>',
    `<tr><td style="padding:16px 24px;background:${EMAIL_THEME.canvas};border-top:1px solid ${EMAIL_THEME.borderSecondary};color:${EMAIL_THEME.foregroundMuted};font-size:10px;line-height:16px">RepoView · Private repository sharing<br>Location and security context are approximate or inferred. RepoView does not use this email to claim a viewer’s real identity.<br>This notification was sent because view notifications are enabled for this share.</td></tr>`,
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('')
}

function formatViewVisitLabel(value: string) {
  const label = cleanText(value, 'First visit')
  if (/\bvisit\s*#\s*\d+/i.test(label)) return label.toUpperCase()
  if (/^first visit$/i.test(label)) return 'FIRST VISIT · VISIT #1'
  return label.toUpperCase()
}

function formatSessionVisitLabel(value: string) {
  const label = cleanText(value, 'Visit')
  const visitNumber = label.match(/\bvisit\s*#?\s*(\d+)/i)?.[1] ?? label.match(/\b(\d+)\s+visits?\b/i)?.[1]
  if (visitNumber) return `VISIT #${visitNumber}`
  if (/^first visit$/i.test(label)) return 'VISIT #1'
  return label.toUpperCase()
}

function repositoryPanel(repositoryName: string, ref: string, recipientLabel: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="padding-top:20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0"><tr><td style="padding:14px 15px;border:1px solid ${EMAIL_THEME.border};border-radius:8px;background:${EMAIL_THEME.surfaceSecondary}"><p style="margin:0;color:${EMAIL_THEME.foregroundMuted};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:.04em;line-height:15px">REPOSITORY</p><p style="margin:5px 0 0;color:${EMAIL_THEME.foreground};font-size:15px;font-weight:600;line-height:20px;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(repositoryName)}</p><p style="margin:4px 0 0;color:${EMAIL_THEME.foregroundMuted};font-size:12px;line-height:18px;word-break:break-word;overflow-wrap:anywhere"><span style="color:${EMAIL_THEME.foregroundLight};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${escapeHtml(ref)}</span><span> · ${escapeHtml(recipientLabel)}</span></p></td></tr></table></td></tr></table>`
}

function section(title: string, content: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="padding:24px 0 0"><p style="margin:0 0 5px;color:${EMAIL_THEME.foregroundMuted};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:600;letter-spacing:.04em;line-height:15px;text-transform:uppercase">${escapeHtml(title)}</p>${content}</td></tr></table>`
}

function detailsTable(rows: Array<{ label: string; value: string; monospace?: boolean }>) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.map((row, index) => `<tr><td width="140" valign="top" style="width:140px;padding:9px 12px 9px 0${index < rows.length - 1 ? `;border-bottom:1px solid ${EMAIL_THEME.borderSecondary}` : ''};color:${EMAIL_THEME.foregroundMuted};font-size:12px;font-weight:500;line-height:18px">${escapeHtml(row.label)}</td><td valign="top" style="padding:9px 0${index < rows.length - 1 ? `;border-bottom:1px solid ${EMAIL_THEME.borderSecondary}` : ''};color:${EMAIL_THEME.foregroundLight};font-family:${row.monospace ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'Inter,-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Arial,sans-serif'};font-size:13px;font-weight:500;line-height:18px;word-break:break-word;overflow-wrap:anywhere">${escapeHtml(row.value)}</td></tr>`).join('')}</table>`
}

function metricsTable(metrics: [{ label: string; value: string | number }, { label: string; value: string | number }, { label: string; value: string | number }, { label: string; value: string | number }]) {
  const cell = (metric: { label: string; value: string | number }, padRight: boolean) => `<td width="50%" valign="top" style="width:50%;padding:0 ${padRight ? '8px' : '0'} 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr><td style="padding:10px 12px;border:1px solid ${EMAIL_THEME.border};border-radius:6px;background:${EMAIL_THEME.surface}"><span style="display:block;color:${EMAIL_THEME.foregroundMuted};font-size:11px;font-weight:500;line-height:15px">${escapeHtml(metric.label)}</span><strong style="display:block;margin-top:3px;color:${EMAIL_THEME.foreground};font-size:19px;font-weight:600;line-height:23px;word-break:break-word">${escapeHtml(String(metric.value))}</strong></td></tr></table></td>`
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${cell(metrics[0], true)}${cell(metrics[1], false)}</tr><tr>${cell(metrics[2], true)}${cell(metrics[3], false)}</tr></table>`
}

function warningPanel(title: string, alerts: string[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0"><tr><td style="padding:12px 14px;border:1px solid ${EMAIL_THEME.warningBorder};border-radius:8px;background:${EMAIL_THEME.warningSurface};color:${EMAIL_THEME.warningForeground};font-size:12px;line-height:18px"><strong style="display:block;margin:0 0 4px;font-size:12px;font-weight:600">${escapeHtml(title)}</strong>${alerts.map(escapeHtml).join('<br>')}</td></tr></table>`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

function formatEmailDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  const datePart = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
  return `${datePart} · ${timePart} UTC`
}

function formatSecurityContext(input: Pick<ViewNotificationEmailInput, 'isProbableBot' | 'vpnIndication' | 'proxyIndication' | 'torIndication' | 'datacenterIndication' | 'securitySignals'>) {
  const signals = isRecord(input.securitySignals) ? input.securitySignals : {}
  const concurrentSessions = typeof signals.concurrent_sessions === 'number' && Number.isFinite(signals.concurrent_sessions)
    ? `${Math.max(1, Math.floor(signals.concurrent_sessions))} concurrent session(s) (inferred)`
    : 'Not available'
  return [
    `Probable bot signal: ${formatInferredBoolean(input.isProbableBot ?? false)}`,
    `VPN signal: ${formatInferredBoolean(input.vpnIndication)}`,
    `Proxy signal: ${formatInferredBoolean(input.proxyIndication)}`,
    `Tor signal: ${formatInferredBoolean(input.torIndication)}`,
    `Datacenter signal: ${formatInferredBoolean(input.datacenterIndication)}`,
    `Possible link forwarding: ${formatInferredBoolean(signals.possible_link_forwarding)}`,
    `New network: ${formatInferredBoolean(signals.new_network)}`,
    `Concurrent sessions: ${concurrentSessions}`,
  ].join('; ')
}

function formatInferredBoolean(value: unknown) {
  return value === true ? 'Yes (inferred)' : value === false ? 'No (inferred)' : 'Not available'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function formatDevice(value: string | null) {
  if (!value) return 'Not available'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatLocation(city?: string | null, region?: string | null, country?: string | null) {
  return [city, region, country].filter(Boolean).join(', ') || 'Not available'
}

function cleanText(value: string, fallback: string) {
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200)
  return cleaned || fallback
}

function cleanSubject(value: string) {
  return cleanText(value, 'Share').replace(/[\r\n]/g, ' ')
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}
