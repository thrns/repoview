import { ArrowLeft, CheckCircle2, ChevronDown, LockKeyhole, MoreHorizontal, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui'
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

  return (
    <section className="mx-auto w-full max-w-[1180px] px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
      <Link href="/dashboard/shares" className="inline-flex items-center gap-2 text-xs font-medium text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Shares
      </Link>

      <header className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-[28px] font-semibold tracking-[-0.035em] text-wrap-balance">{item.share.recipient_label || 'Generic share'}</h1>
            <ShareStatusBadge status={item.status} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground-muted">
            <span className="font-mono text-[13px] text-foreground">{repositoryName}</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-[13px]">{item.share.ref}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:pt-0.5">
          <RotateShareButton shareId={item.share.id} />
          <ShareOverflowMenu shareId={item.share.id} currentExpiresAt={item.share.expires_at} disabled={item.status === 'revoked'} />
        </div>
      </header>

      <section aria-labelledby="engagement-summary" className="mt-10 border-y border-border/60 py-4">
        <h2 id="engagement-summary" className="sr-only">Engagement summary</h2>
        <dl className="flex flex-wrap gap-x-10 gap-y-4 sm:gap-x-14">
          <SummaryItem label="Views" value={<span className="text-base font-semibold tabular-nums">{item.confirmedViews}</span>} />
          <SummaryItem label="Last viewed" value={item.lastViewedAt ? <Timestamp value={item.lastViewedAt} /> : <span>Never</span>} />
          <SummaryItem label="Created" value={<Timestamp value={item.share.created_at} mode="date" />} />
          <SummaryItem label="Expires" value={item.share.expires_at ? <Timestamp value={item.share.expires_at} mode="date" /> : <span>Never</span>} />
        </dl>
      </section>

      <div className="space-y-14 pt-12">
        <SessionsSection sessions={sessions} activity={activity} />
        {activity.length > 0 ? <ActivitySection activity={activity} sessions={sessions} /> : null}
        <ShareSettingsSection shareId={item.share.id} item={item} notifications={notifications} />
      </div>
    </section>
  )
}

function ShareOverflowMenu({ shareId, currentExpiresAt, disabled }: { shareId: string; currentExpiresAt: string | null; disabled: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-9 w-9 border-transparent bg-transparent px-0 text-foreground-muted hover:bg-accent hover:text-foreground" aria-label="More share options">
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="right-0 mt-1 w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.08em]">Share options</DropdownMenuLabel>
        <div className="flex gap-2 px-2 py-2.5 text-xs text-foreground-muted">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
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

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-[7rem]">
      <dt className="text-[11px] font-medium text-foreground-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">{value}</dd>
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
    <section aria-labelledby="viewer-sessions">
      <SectionHeading
        id="viewer-sessions"
        title="Viewer sessions"
        description={`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} · ${confirmedCount} confirmed`}
      />
      {sessions.length === 0 ? <EmptyDetailState text="No viewer sessions yet." /> : (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[720px]" role="table">
            <div className="grid grid-cols-[minmax(13rem,1.6fr)_minmax(9rem,1fr)_minmax(6rem,.7fr)_minmax(7rem,.8fr)] gap-4 px-4 pb-2 text-[11px] font-medium text-foreground-muted" role="row">
              <span role="columnheader">Status</span>
              <span role="columnheader">Last seen</span>
              <span role="columnheader">Duration</span>
              <span role="columnheader">Activity</span>
            </div>
            <div className="divide-y divide-border/55 border-y border-border/60" role="rowgroup">
              {sessions.map((session) => <SessionRow key={session.id} session={session} activityCount={activityCountBySession.get(session.id) ?? 0} />)}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function SectionHeading({ id, title, description }: { id: string; title: string; description: string }) {
  return (
    <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h2 id={id} className="font-heading text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="text-xs text-foreground-muted">{description}</p>
    </header>
  )
}

function SessionRow({ session, activityCount }: { session: ShareSessionSummary; activityCount: number }) {
  const confirmed = Boolean(session.confirmedAt)
  const likelyScanner = session.isProbableBot && !confirmed
  const statusLabel = confirmed ? 'Confirmed' : likelyScanner ? 'Likely scanner' : 'Pending'
  const context = [session.browser, session.os].filter(Boolean).join(' · ')
  const device = session.deviceType || 'Unknown device'
  const location = session.country || 'Unknown location'

  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(13rem,1.6fr)_minmax(9rem,1fr)_minmax(6rem,.7fr)_minmax(7rem,.8fr)] gap-4 px-4 py-3.5 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden" role="row">
        <span className="flex min-w-0 items-center justify-between gap-3 text-sm font-medium text-foreground" role="cell">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className={`size-1.5 shrink-0 rounded-full ${confirmed ? 'bg-success' : 'bg-foreground-muted/60'}`} aria-hidden="true" />
            <span className="truncate">{statusLabel}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-foreground-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
        <span className="whitespace-nowrap text-xs text-foreground-muted" role="cell"><Timestamp value={session.lastSeenAt} /></span>
        <span className="whitespace-nowrap text-xs tabular-nums text-foreground-muted" role="cell">~{formatDuration(session.approximateDurationMinutes)}</span>
        <span className="whitespace-nowrap text-xs text-foreground-muted" role="cell"><span className="font-medium tabular-nums text-foreground">{activityCount}</span> {activityCount === 1 ? 'event' : 'events'}</span>
      </summary>
      <div className="grid gap-4 border-t border-border/50 bg-muted/15 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
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

function ActivitySection({ activity, sessions }: { activity: ShareActivitySummary[]; sessions: ShareSessionSummary[] }) {
  const groups = groupActivity(activity, sessions)

  return (
    <section aria-labelledby="recent-activity">
      <SectionHeading id="recent-activity" title="Recent activity" description="Latest viewer events" />
      <div className="mt-5 space-y-5">
        {groups.map((group) => <ActivityGroup key={group.id} group={group} />)}
      </div>
    </section>
  )
}

function ActivityGroup({ group }: { group: ActivityGroupData }) {
  return (
    <div className="grid gap-3 border-b border-border/50 pb-5 last:border-b-0 last:pb-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <span className={`size-1.5 rounded-full ${group.session?.confirmedAt ? 'bg-success' : 'bg-foreground-muted/60'}`} aria-hidden="true" />
        <span>{group.session ? getSessionStatusLabel(group.session) : 'Share lifecycle'}</span>
      </div>
      <ol className="min-w-0 space-y-2">
        {group.events.map((event) => (
          <li key={event.id} className="flex min-w-0 items-baseline justify-between gap-4 text-xs">
            <div className="min-w-0">
              <span className="font-medium text-foreground">{formatEventType(event.eventType)}</span>
              {event.path ? <span className="ml-2 inline-block max-w-[55%] truncate align-bottom font-mono text-[11px] text-foreground-muted" title={event.path}>{event.path}</span> : null}
            </div>
            <Timestamp value={event.createdAt} />
          </li>
        ))}
      </ol>
    </div>
  )
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

  return (
    <section aria-labelledby="share-settings">
      <details className="group border-y border-border/60">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <h2 id="share-settings" className="font-heading text-base font-semibold tracking-[-0.01em]">Share settings</h2>
          <span className="flex items-center gap-2 text-xs text-foreground-muted">
            Access, visibility, notifications, and notes
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="space-y-8 border-t border-border/50 py-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium">Access</h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailField label="Repository" value={repositoryName} mono />
                <DetailField label="Ref" value={item.share.ref} mono />
                <DetailField label="Downloads" value={item.share.allow_download ? 'Allowed' : 'Disabled'} />
                <DetailField label="Notify on view" value={item.share.notify_on_view ? 'Enabled' : 'Disabled'} />
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium">Visibility policy</h3>
              <div className="mt-4 space-y-3"><VisibilityRules rules={item.share.rules} /></div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Notifications</h3>
                {notifications.some((notification) => notification.status !== 'sent' || notification.errorText) ? <Badge variant="destructive" className="text-[10px]">Needs attention</Badge> : null}
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <DetailField label="On meaningful view" value={item.share.notify_on_view ? 'Enabled' : 'Disabled'} />
                {notifications.length > 0 ? <DetailField label="Delivery attempts" value={String(notifications.length)} /> : null}
              </dl>
              {notifications.length > 0 ? <NotificationHistory notifications={notifications} /> : null}
            </div>
            <div>
              <h3 className="text-sm font-medium">Notes</h3>
              <div className="mt-4 flex items-start justify-between gap-4">
                <p className="min-w-0 whitespace-pre-wrap text-sm leading-6 text-foreground-muted">{item.share.note || 'No note added.'}</p>
                <UpdateShareNoteButton shareId={shareId} note={item.share.note} compact />
              </div>
            </div>
          </div>
        </div>
      </details>
    </section>
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className={mono ? 'truncate font-mono text-xs text-foreground' : 'text-sm text-foreground'} title={value}>{value}</dd>
    </div>
  )
}

function VisibilityRules({ rules }: { rules: unknown }) {
  const parsed = rules && typeof rules === 'object' ? rules as { hidden?: unknown; allowOnly?: unknown } : {}
  const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is string => typeof value === 'string') : []
  const allowOnly = Array.isArray(parsed.allowOnly) ? parsed.allowOnly.filter((value): value is string => typeof value === 'string') : []

  return (
    <>
      <RuleList label="Hidden" values={hidden} />
      <RuleList label="Allow only" values={allowOnly} />
    </>
  )
}

function RuleList({ label, values }: { label: string; values: string[] }) {
  return <p className="text-sm leading-6"><span className="text-foreground-muted">{label}:</span> <span className={values.length > 0 ? 'font-mono text-xs text-foreground' : 'text-foreground-muted'}>{values.length > 0 ? values.join(', ') : 'None'}</span></p>
}

function NotificationHistory({ notifications }: { notifications: ShareNotificationSummary[] }) {
  return (
    <details className="group mt-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
        View delivery history
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3 space-y-3">
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
        <p className={`mt-0.5 text-[11px] ${sent ? 'text-foreground-muted' : 'text-destructive'}`}>{notification.errorText || (notification.sentAt ? `Sent ${formatRelativeTimestamp(notification.sentAt)}` : `Attempted ${formatRelativeTimestamp(notification.createdAt)}`)}</p>
      </div>
    </div>
  )
}

function EmptyDetailState({ text }: { text: string }) {
  return <p className="mt-4 py-6 text-center text-sm text-foreground-muted">{text}</p>
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
