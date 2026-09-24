export type ViewNotificationEmailInput = {
  recipientLabel: string | null
  viewerLabel?: string | null
  visitLabel?: string | null
  repositoryName: string
  ref: string
  confirmedAt: string
  browser: string | null
  os: string | null
  deviceType: string | null
  country: string | null
  city?: string | null
  region?: string | null
  referrer?: string | null
  shareId: string
  appUrl: string
}

export type ViewNotificationEmail = {
  subject: string
  text: string
  html: string
}

export function buildViewNotificationEmail(input: ViewNotificationEmailInput): ViewNotificationEmail {
  const recipientLabel = cleanText(input.recipientLabel ?? input.viewerLabel ?? 'Share', 'Share')
  const viewerLabel = cleanText(input.viewerLabel ?? recipientLabel, recipientLabel)
  const visitLabel = cleanText(input.visitLabel ?? 'First visit', 'First visit')
  const repositoryName = cleanText(input.repositoryName, 'repository')
  const ref = cleanText(input.ref, 'unknown ref')
  const viewedAt = formatDate(input.confirmedAt)
  const browser = input.browser || 'Unknown'
  const os = input.os || 'Unknown'
  const device = formatDevice(input.deviceType)
  const location = formatLocation(input.city, input.region, input.country)
  const referrer = input.referrer || 'Not available'
  const activityUrl = new URL(`/dashboard/shares/${encodeURIComponent(input.shareId)}`, input.appUrl).toString()
  const logoUrl = new URL('/repoview-logo-white.svg', input.appUrl).toString()
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
    `Browser: ${browser}`,
    `OS: ${os}`,
    `Device: ${device}`,
    `Approx. location: ${location}`,
    `Referrer: ${referrer}`,
    '',
    `View activity: ${activityUrl}`,
  ]

  return {
    subject,
    text: lines.join('\n'),
    html: buildViewHtml({ recipientLabel, viewerLabel, visitLabel, repositoryName, ref, viewedAt, browser, os, device, location, referrer, activityUrl, logoUrl }),
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
  const logoUrl = new URL('/repoview-logo-white.svg', input.appUrl).toString()
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
      endedAt: formatDate(input.endedAt),
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
  browser: string
  os: string
  device: string
  location: string
  referrer: string
  activityUrl: string
  logoUrl: string
}) {
  const field = (label: string, value: string, last = false) => `<tr><td style="padding:13px 0${last ? '' : ';border-bottom:1px solid #e8edf3'}"><span style="display:block;color:#667085;font-size:12px;font-weight:600;letter-spacing:.02em">${escapeHtml(label)}</span><span style="display:block;margin-top:3px;color:#101828;font-size:14px;line-height:20px;word-break:break-word">${escapeHtml(value)}</span></td></tr>`
  const details = [
    field('Share', values.recipientLabel),
    field('Viewer', values.viewerLabel),
    field('Visit', values.visitLabel),
    field('Repository', values.repositoryName),
    field('Ref', values.ref),
    field('Viewed', values.viewedAt),
    field('Browser · OS · device', `${values.browser} · ${values.os} · ${values.device}`),
    field('Approx. location', values.location),
    field('Referrer', values.referrer, true),
  ].join('')

  return emailShell({
    preheader: `${values.viewerLabel} viewed ${values.repositoryName}`,
    eyebrow: values.visitLabel,
    title: 'Your repository was viewed',
    intro: 'A confirmed browser session opened your private source share.',
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${details}</table>`,
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
  const metric = (label: string, value: string | number) => `<td width="50%" style="padding:14px 16px;border:1px solid #e8edf3;background:#f8fafc"><span style="display:block;color:#667085;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">${escapeHtml(label)}</span><strong style="display:block;margin-top:5px;color:#101828;font-size:20px;line-height:24px">${escapeHtml(String(value))}</strong></td>`
  const detail = (label: string, value: string) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e8edf3"><span style="color:#667085;font-size:12px">${escapeHtml(label)}</span><span style="float:right;color:#101828;font-size:13px;font-weight:600;text-align:right">${escapeHtml(value)}</span></td></tr>`
  const topFiles = input.topFiles.map((file) => cleanText(file, 'Unknown file')).slice(0, 5)
  const filesBlock = `<div style="margin-top:20px;padding:14px 16px;border:1px solid #e8edf3;border-radius:10px;background:#f8fafc"><p style="margin:0 0 8px;color:#667085;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Top files by dwell</p>${topFiles.length > 0 ? topFiles.map((file) => `<p style="margin:5px 0;color:#334155;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:18px;word-break:break-word">${escapeHtml(file)}</p>`).join('') : '<p style="margin:0;color:#667085;font-size:13px">None recorded</p>'}</div>`
  const securityBlock = input.securityAlerts.length > 0
    ? `<div style="margin-top:20px;padding:13px 15px;border:1px solid #f3d7a6;border-radius:10px;background:#fff8eb;color:#8a5a00;font-size:13px;line-height:19px"><strong style="font-size:12px">Inferred security signals</strong><br>${input.securityAlerts.map(escapeHtml).join('<br>')}</div>`
    : ''

  return emailShell({
    preheader: `${input.viewerLabel} session summary for ${input.repositoryName}`,
    eyebrow: input.visitLabel,
    title: 'Session summary',
    intro: `The viewing session for ${input.repositoryName} has ended.`,
    content: [
      `<p style="margin:0 0 16px;color:#667085;font-size:13px;line-height:20px">${escapeHtml(input.recipientLabel)} · <span style="color:#101828;font-weight:600">${escapeHtml(input.viewerLabel)}</span></p>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;margin:0 -8px 18px"> <tr>${metric('Duration', input.duration)}${metric('Files viewed', input.filesViewed)}</tr><tr>${metric('Directories', input.directoriesViewed)}${metric('Searches', input.searches)}</tr></table>`,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${detail('Repository', input.repositoryName)}${detail('Ref', input.ref)}${detail('Copies', String(input.copies))}${detail('Downloads', String(input.downloads))}${detail('First file', input.firstFile || 'None recorded')}${detail('Last file', input.lastFile || 'None recorded')}${detail('Session ended', input.endedAt)}</table>`,
      filesBlock,
      securityBlock,
    ].join(''),
    activityUrl: input.activityUrl,
    ctaLabel: 'Open viewer analytics',
    logoUrl: input.logoUrl,
  })
}

function emailShell(input: { preheader: string; eyebrow: string; title: string; intro: string; content: string; activityUrl: string; ctaLabel: string; logoUrl: string }) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RepoView</title></head>',
    '<body style="margin:0;padding:0;background:#f4f6fa;color:#101828;font-family:-apple-system,BlinkMacSystemFont,&quot;Segoe UI&quot;,Arial,sans-serif;-webkit-font-smoothing:antialiased">',
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(input.preheader)}</div>`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f4f6fa">',
    '<tr><td align="center" style="padding:28px 16px 36px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e5eaf0;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(16,24,40,.08)">',
    '<tr><td style="padding:22px 28px;background:#101828">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>',
    `<td><img src="${escapeHtml(input.logoUrl)}" width="28" height="28" alt="RepoView" style="display:inline-block;vertical-align:middle"><span style="margin-left:10px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:-.01em;vertical-align:4px">RepoView</span></td>`,
    '<td align="right"><span style="color:#98a2b3;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px">PRIVATE SHARE</span></td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td style="padding:34px 32px 32px">',
    `<p style="margin:0;color:#2f80ed;font-size:11px;font-weight:700;letter-spacing:.1em;line-height:16px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</p>`,
    `<h1 style="margin:10px 0 10px;color:#101828;font-size:30px;font-weight:750;letter-spacing:-.04em;line-height:36px">${escapeHtml(input.title)}</h1>`,
    `<p style="margin:0 0 26px;color:#667085;font-size:15px;line-height:24px">${escapeHtml(input.intro)}</p>`,
    input.content,
    `<p style="margin:28px 0 0"><a href="${escapeHtml(input.activityUrl)}" style="display:inline-block;padding:12px 17px;border-radius:9px;background:#2f80ed;color:#ffffff;font-size:13px;font-weight:700;line-height:18px;text-decoration:none">${escapeHtml(input.ctaLabel)} <span style="font-size:16px">→</span></a></p>`,
    '<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #eef1f5;color:#98a2b3;font-size:11px;line-height:17px">Location and security context are approximate or inferred. RepoView does not use this email to claim a viewer’s real identity.</p>',
    '</td></tr>',
    '<tr><td style="padding:17px 28px;background:#f8fafc;border-top:1px solid #eef1f5;color:#98a2b3;font-size:11px;line-height:17px">RepoView · Private repository sharing<br>This notification was sent because view notifications are enabled for this share.</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('')
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

function formatDevice(value: string | null) {
  if (!value) return 'Unknown'
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
