import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Eye,
  FileCode2,
  FileText,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge, Card, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, PageContainer } from '@/components/ui'
import type { ShareActivitySummary, ShareDetailData, ShareNotificationSummary, ShareSessionSummary } from '@/lib/shares/detail'

import { RevokeShareButton } from './revoke-share-button'
import { RotateShareButton } from './rotate-share-button'
import { ShareStatusBadge } from './shares-view'
import { UpdateShareExpiryButton } from './update-share-expiry-button'
import { UpdateShareNoteButton } from './update-share-note-button'

export function ShareDetailView({ data }: { data: ShareDetailData }) {
  const { item, sessions, activity, notifications } = data
  const repositoryName = item.repository
    ? `${item.repository.github_owner}/${item.repository.github_repo}`
    : 'Repository unavailable'
  const shareLabel = item.share.recipient_label || (item.share.share_type === 'recipient' ? 'Recipient share' : 'Generic share')

  return (
    <PageContainer size="default" className="py-6 lg:py-10">
      <Link href="/dashboard/shares" className="inline-flex items-center gap-2 text-xs font-medium text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Shares
      </Link>

      <Card className="mt-7 overflow-hidden rounded-md">
        <header className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="type-page-title">{shareLabel}</h1>
              <ShareStatusBadge status={item.status} />
            </div>
            <div className="mt-3 flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs text-foreground-muted">
              <Link2 className="size-3.5 shrink-0 text-foreground-light" aria-hidden="true" />
              <span className="min-w-0 max-w-full break-all rounded-md bg-muted/45 px-2 py-1 font-mono text-xs text-foreground" title={repositoryName}>{repositoryName}</span>
              <span aria-hidden="true" className="text-foreground-muted/60">/</span>
              <span className="max-w-full break-all rounded-md bg-muted/45 px-2 py-1 font-mono text-xs text-foreground-muted" title={item.share.ref}>{item.share.ref}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <RotateShareButton shareId={item.share.id} revoked={item.status === 'revoked'} />
            <ShareOverflowMenu shareId={item.share.id} currentExpiresAt={item.share.expires_at} disabled={item.status === 'revoked'} />
          </div>
        </header>

        <section aria-labelledby="engagement-summary" className="border-t border-border/60 bg-muted/18 px-3 py-3 sm:px-4">
          <h2 id="engagement-summary" className="sr-only">Engagement summary</h2>
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <SummaryItem icon={<Eye className="size-3.5" />} label="Views" value={<span className="font-heading text-lg font-semibold tabular-nums">{item.confirmedViews}</span>} tone="primary" />
            <SummaryItem icon={<Clock3 className="size-3.5" />} label="Last viewed" value={item.lastViewedAt ? <Timestamp value={item.lastViewedAt} /> : <span>Never</span>} />
            <SummaryItem icon={<CalendarDays className="size-3.5" />} label="Created" value={<Timestamp value={item.share.created_at} mode="date" />} />
            <SummaryItem icon={<CalendarClock className="size-3.5" />} label="Expires" value={item.share.expires_at ? <Timestamp value={item.share.expires_at} mode="date" /> : <span>Never</span>} tone={item.share.expires_at ? undefined : 'muted'} />
          </dl>
        </section>
      </Card>

      <div className="mt-8 space-y-8">
        <SessionsSection sessions={sessions} activity={activity} />
        {activity.length > 0 ? <ActivitySection activity={activity} sessions={sessions} /> : null}
        <ShareSettingsSection shareId={item.share.id} item={item} notifications={notifications} />
      </div>
    </PageContainer>
  )
}

function ShareOverflowMenu({ shareId, currentExpiresAt, disabled }: { shareId: string; currentExpiresAt: string | null; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-9 w-9 border-transparent bg-transparent px-0 text-foreground-muted hover:bg-accent hover:text-foreground" aria-label="More share options">
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="right-0 mt-1 w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-medium uppercase tracking-wider">Share options</DropdownMenuLabel>
        <div className="flex gap-2 rounded-md bg-muted/30 px-2 py-2.5 text-xs text-foreground-muted">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-foreground-light" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">Secret URL</p>
            <p className="mt-0.5 leading-5">Stored as a one-way hash and not recoverable.</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <div className="[&>button]:h-8 [&>button]:w-full [&>button]:justify-start [&>button]:px-2 [&>button]:text-xs">
          <UpdateShareExpiryButton shareId={shareId} currentExpiresAt={currentExpiresAt} disabled={disabled} compact />
        </div>
        <DropdownMenuSeparator />
        <div className="[&>div>button]:h-8 [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:px-2 [&>div>button]:text-xs [&>div>button]:text-destructive [&>div>button]:hover:bg-destructive/10 [&>div>button]:hover:text-destructive">
          <RevokeShareButton shareId={shareId} disabled={disabled} compact />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SummaryItem({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone?: 'primary' | 'muted' }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/55 bg-card/75 px-3 py-3 sm:px-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${tone === 'primary' ? 'bg-surface-200 text-foreground-light' : 'bg-muted text-foreground-muted'}`} aria-hidden="true">{icon}</span>
        <dt className="truncate">{label}</dt>
      </div>
      <dd className={`mt-2 truncate text-sm font-medium ${tone === 'muted' ? 'text-foreground-muted' : 'text-foreground'}`}>{value}</dd>
    </div>
  )
}

function Timestamp({ value, mode = 'relative' }: { value: string; mode?: 'relative' | 'date' }) {
  return <time dateTime={value} title={formatExactDateTime(value)}>{mode === 'date' ? formatSummaryDate(value) : formatRelativeTimestamp(value)}</time>
}

function SessionsSection({ sessions, activity }: { sessions: ShareSessionSummary[]; activity: ShareActivitySummary[] }) {
  const activityCountBySession = new Map<string, number>()
  for (const event of activity) activityCountBySession.set(event.sessionId, (activityCountBySession.get(event.sessionId) ?? 0) + 1)
  const confirmedCount = sessions.filter((session) => session.confirmedAt).length

  return (
    <Card className="overflow-hidden rounded-md">
      <SectionHeading
        id="viewer-sessions"
        icon={<Eye className="size-4" />}
        title="Viewer sessions"
        description={`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} · ${confirmedCount} confirmed`}
      />
      {sessions.length === 0 ? <EmptyDetailState icon={<Eye className="size-4" />} text="No viewer sessions yet. Confirmed sessions will appear here after someone meaningfully opens the share." /> : (
        <ul className="divide-y divide-border/55 px-2 pb-2 sm:px-3" aria-label="Viewer sessions">
          {sessions.map((session) => <li key={session.id}><SessionRow session={session} activityCount={activityCountBySession.get(session.id) ?? 0} /></li>)}
        </ul>
      )}
    </Card>
  )
}

function SectionHeading({ id, icon, title, description }: { id: string; icon: ReactNode; title: string; description: string }) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/55 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-foreground-light" aria-hidden="true">{icon}</span>
        <div className="min-w-0">
          <h2 id={id} className="font-heading text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>
        </div>
      </div>
    </header>
  )
}

function SessionRow({ session, activityCount }: { session: ShareSessionSummary; activityCount: number }) {
  const confirmed = Boolean(session.confirmedAt)
  const likelyScanner = session.isProbableBot && !confirmed
  const context = [session.browser, session.os].filter(Boolean).join(' · ')
  const device = session.deviceType || 'Unknown device'
  const location = session.country || 'Unknown location'

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-lg px-3 py-3.5 outline-none transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-2">
            <SessionStatus confirmed={confirmed} likelyScanner={likelyScanner} />
          </span>
          <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
        </span>
        <span className="grid grid-cols-2 gap-3 text-xs text-foreground-muted sm:grid-cols-3">
          <SessionMetric label="Last seen" value={<Timestamp value={session.lastSeenAt} />} />
          <SessionMetric label="Duration" value={<span className="tabular-nums">~{formatDuration(session.approximateDurationMinutes)}</span>} />
          <SessionMetric label="Activity" value={<><span className="font-medium tabular-nums text-foreground">{activityCount}</span> {activityCount === 1 ? 'event' : 'events'}</>} />
        </span>
      </summary>
      <div className="mx-1 mb-2 grid gap-3 rounded-lg border border-border-secondary bg-surface-200/25 px-3.5 py-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <DetailField label="Session ID" value={session.id} mono />
        <DetailField label="Context" value={context || 'Unavailable'} />
        <DetailField label="Device" value={device} />
        <DetailField label="Location" value={location} />
        <DetailField label="First confirmed" value={session.confirmedAt ? formatExactDateTime(session.confirmedAt) : 'Not confirmed'} />
        {session.viewedPaths.length > 0 ? <DetailField label="Viewed paths" value={session.viewedPaths.join(', ')} mono /> : null}
      </div>
    </details>
  )
}

function SessionStatus({ confirmed, likelyScanner }: { confirmed: boolean; likelyScanner: boolean }) {
  if (confirmed) return <Badge variant="success" className="gap-1.5"><CheckCircle2 className="size-3.5" aria-hidden="true" />Confirmed</Badge>
  if (likelyScanner) return <Badge variant="warning" className="gap-1.5"><AlertTriangle className="size-3.5" aria-hidden="true" />Likely scanner</Badge>
  return <Badge variant="secondary" className="gap-1.5"><Clock3 className="size-3.5" aria-hidden="true" />Pending</Badge>
}

function SessionMetric({ label, value }: { label: string; value: ReactNode }) {
  return <span><span className="block text-xs text-foreground-muted/80">{label}</span><span className="mt-0.5 block whitespace-nowrap text-foreground-muted">{value}</span></span>
}

function ActivitySection({ activity, sessions }: { activity: ShareActivitySummary[]; sessions: ShareSessionSummary[] }) {
  const groups = groupActivity(activity, sessions)

  return (
    <Card className="overflow-hidden rounded-md">
      <SectionHeading id="recent-activity" icon={<Activity className="size-4" />} title="Recent activity" description="Events connected to viewer sessions" />
      <div className="space-y-3 p-3 sm:p-4">
        {groups.map((group) => <ActivityGroup key={group.id} group={group} />)}
      </div>
    </Card>
  )
}

function ActivityGroup({ group }: { group: ActivityGroupData }) {
  const confirmed = Boolean(group.session?.confirmedAt)

  return (
    <div className="rounded-lg border border-border/60 bg-muted/18 p-3.5 transition-colors hover:border-border-secondary hover:bg-accent/20 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
          <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${confirmed ? 'bg-success/10 text-success' : 'bg-muted text-foreground-muted'}`} aria-hidden="true">
            {confirmed ? <CheckCircle2 className="size-3.5" /> : <Clock3 className="size-3.5" />}
          </span>
          <span className="truncate">{group.session ? getSessionStatusLabel(group.session) : 'Share lifecycle'}</span>
        </div>
        <span className="text-xs text-foreground-muted">{group.events.length} {group.events.length === 1 ? 'event' : 'events'}</span>
      </div>
      <ol className="mt-3 space-y-2">
        {group.events.map((event) => (
          <li key={event.id} className="flex min-w-0 items-start gap-2.5 rounded-md bg-background/45 px-2.5 py-2 text-xs transition-colors hover:bg-background/75">
            <EventIcon eventType={event.eventType} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="font-medium text-foreground">{formatEventType(event.eventType)}</span>
                <span className="shrink-0 text-foreground-muted"><Timestamp value={event.createdAt} /></span>
              </div>
              {event.path ? <p className="mt-1 max-w-full truncate font-mono text-xs text-foreground-muted" title={event.path}>{event.path}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function EventIcon({ eventType }: { eventType: string }) {
  const normalized = eventType.toLowerCase()
  if (normalized.includes('notification')) return <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning" aria-hidden="true"><Bell className="size-3.5" /></span>
  if (normalized.includes('copy')) return <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-200 text-foreground-light" aria-hidden="true"><Copy className="size-3.5" /></span>
  if (normalized.includes('download')) return <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-200 text-foreground-light" aria-hidden="true"><ArrowDownToLine className="size-3.5" /></span>
  if (normalized.includes('file') || normalized.includes('markdown') || normalized.includes('directory')) return <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success" aria-hidden="true"><FileCode2 className="size-3.5" /></span>
  return <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-foreground-muted" aria-hidden="true"><Activity className="size-3.5" /></span>
}

type ActivityGroupData = { id: string; session: ShareSessionSummary | null; events: ShareActivitySummary[] }

function groupActivity(activity: ShareActivitySummary[], sessions: ShareSessionSummary[]): ActivityGroupData[] {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]))
  const groups = new Map<string, ActivityGroupData>()

  for (const event of activity) {
    const group = groups.get(event.sessionId) ?? { id: event.sessionId, session: sessionMap.get(event.sessionId) ?? null, events: [] }
    group.events.push(event)
    groups.set(event.sessionId, group)
  }

  return [...groups.values()].sort((a, b) => new Date(b.events[0].createdAt).getTime() - new Date(a.events[0].createdAt).getTime())
}

function ShareSettingsSection({ shareId, item, notifications }: { shareId: string; item: ShareDetailData['item']; notifications: ShareNotificationSummary[] }) {
  const repositoryName = item.repository ? `${item.repository.github_owner}/${item.repository.github_repo}` : 'Repository unavailable'
  const hasNotificationIssue = notifications.some((notification) => notification.status !== 'sent' || notification.errorText)

  return (
    <Card className="overflow-hidden rounded-md">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition-colors hover:bg-accent/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-6 [&::-webkit-details-marker]:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground-muted" aria-hidden="true"><ShieldCheck className="size-4" /></span>
            <div className="min-w-0">
              <h2 id="share-settings" className="font-heading text-base font-semibold tracking-tight">Share settings</h2>
              <p className="mt-0.5 truncate text-xs text-foreground-muted">Access, visibility, notifications, and notes</p>
            </div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-foreground-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-border/55 bg-muted/12 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SettingsPanel icon={<LockKeyhole className="size-3.5" />} title="Access">
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Repository" value={repositoryName} mono />
                <DetailField label="Ref" value={item.share.ref} mono />
                <DetailField label="Downloads" value={item.share.allow_download ? 'Allowed' : 'Disabled'} />
                <DetailField label="Notify on view" value={item.share.notify_on_view ? 'Enabled' : 'Disabled'} />
              </dl>
            </SettingsPanel>

            <SettingsPanel icon={<ShieldCheck className="size-3.5" />} title="Visibility policy">
              <VisibilityRules rules={item.share.rules} />
            </SettingsPanel>

            <SettingsPanel icon={<Bell className="size-3.5" />} title="Notifications" badge={hasNotificationIssue ? <Badge variant="destructive" className="text-xs">Needs attention</Badge> : undefined}>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailField label="On meaningful view" value={item.share.notify_on_view ? 'Enabled' : 'Disabled'} />
                {notifications.length > 0 ? <DetailField label="Delivery attempts" value={String(notifications.length)} /> : null}
              </dl>
              {notifications.length > 0 ? <NotificationHistory notifications={notifications} /> : null}
            </SettingsPanel>

            <SettingsPanel icon={<FileText className="size-3.5" />} title="Notes" action={<UpdateShareNoteButton shareId={shareId} note={item.share.note} compact />}>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground-muted">{item.share.note || 'No note added.'}</p>
            </SettingsPanel>
          </div>
        </div>
      </details>
    </Card>
  )
}

function SettingsPanel({ icon, title, badge, action, children }: { icon: ReactNode; title: string; badge?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border border-border/60 bg-card/75 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <span className="text-foreground-light" aria-hidden="true">{icon}</span>
          <h3 className="truncate">{title}</h3>
          {badge}
        </div>
        {action}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className={mono ? 'break-all font-mono text-xs text-foreground' : 'break-words text-sm text-foreground'} title={value}>{value}</dd>
    </div>
  )
}

function VisibilityRules({ rules }: { rules: unknown }) {
  const parsed = rules && typeof rules === 'object' ? rules as { hidden?: unknown; allowOnly?: unknown } : {}
  const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is string => typeof value === 'string') : []
  const allowOnly = Array.isArray(parsed.allowOnly) ? parsed.allowOnly.filter((value): value is string => typeof value === 'string') : []

  return <div className="space-y-2"><RuleList label="Hidden" values={hidden} /><RuleList label="Allow only" values={allowOnly} /></div>
}

function RuleList({ label, values }: { label: string; values: string[] }) {
  return <div className="rounded-md bg-muted/35 px-3 py-2 text-sm leading-6"><span className="text-foreground-muted">{label}</span><span className="mx-2 text-foreground-muted/50">·</span><span className={values.length > 0 ? 'break-words font-mono text-xs text-foreground' : 'text-foreground-muted'}>{values.length > 0 ? values.join(', ') : 'None'}</span></div>
}

function NotificationHistory({ notifications }: { notifications: ShareNotificationSummary[] }) {
  return (
    <details className="group mt-4 rounded-md border border-border/55 bg-muted/25 px-3 py-2.5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
        View delivery history
        <ChevronDown className="size-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
        {notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} />)}
      </div>
    </details>
  )
}

function NotificationRow({ notification }: { notification: ShareNotificationSummary }) {
  const sent = notification.status === 'sent'
  return (
    <div className="flex items-start gap-3 text-xs">
      {sent ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{notification.channel} · {sent ? 'Delivered' : formatEventType(notification.status)}</p>
        <p className={`mt-0.5 text-xs ${sent ? 'text-foreground-muted' : 'text-destructive'}`}>{notification.errorText || (notification.sentAt ? `Sent ${formatRelativeTimestamp(notification.sentAt)}` : `Attempted ${formatRelativeTimestamp(notification.createdAt)}`)}</p>
      </div>
    </div>
  )
}

function EmptyDetailState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="mx-3 my-3 flex min-h-40 flex-col items-center justify-center rounded-lg border border-border/55 bg-muted/18 px-5 py-8 text-center sm:mx-4"><span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground-muted" aria-hidden="true">{icon}</span><p className="mt-3 max-w-md text-sm leading-6 text-foreground-muted">{text}</p></div>
}

function getSessionStatusLabel(session: ShareSessionSummary) {
  if (session.confirmedAt) return 'Confirmed session'
  if (session.isProbableBot) return 'Likely scanner'
  return 'Pending session'
}

function formatEventType(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDuration(minutes: number) {
  return minutes < 1 ? '<1m' : `${minutes}m`
}

function formatRelativeTimestamp(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (diffMs >= 0 && diffMs < 60_000) return `${Math.max(1, Math.floor(diffMs / 1_000))}s ago`
  if (diffMs >= 0 && diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`

  const now = new Date()
  if (date.toDateString() === now.toDateString()) return `Today ${formatTime(date)}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${formatTime(date)}`
  if (diffMs >= 0 && diffMs < 7 * 86_400_000) return `${Math.floor(diffMs / 86_400_000)}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatSummaryDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(value)
}

function formatExactDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
