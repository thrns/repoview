import { ArrowLeft, Bell, CalendarClock, CheckCircle2, Eye, FileText, Laptop, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import type { ShareDetailData, ShareNotificationSummary, ShareSessionSummary } from '@/lib/shares/detail'

import { RevokeShareButton } from './revoke-share-button'
import { RotateShareButton } from './rotate-share-button'
import { ShareStatusBadge } from './shares-view'
import { UpdateShareExpiryButton } from './update-share-expiry-button'

export function ShareDetailView({ data }: { data: ShareDetailData }) {
  const { item, sessions, activity, notifications } = data
  const repositoryName = item.repository
    ? `${item.repository.github_owner}/${item.repository.github_repo}`
    : 'Repository unavailable'

  return (
    <div className="space-y-6">
      <Link href="/dashboard/shares" className="inline-flex items-center gap-2 text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to shares
      </Link>

      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground-muted">
            <span>Shares</span>
            <span aria-hidden="true">/</span>
            <span>{item.share.recipient_label || 'Generic share'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{item.share.recipient_label || 'Generic share'}</h1>
            <ShareStatusBadge status={item.status} />
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted">
            <span className="font-mono">{repositoryName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{item.share.ref}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Badge variant="outline" className="w-fit gap-2">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Secret URL not recoverable
          </Badge>
          <UpdateShareExpiryButton shareId={item.share.id} currentExpiresAt={item.share.expires_at} disabled={item.status === 'revoked'} />
          <RotateShareButton shareId={item.share.id} />
          <RevokeShareButton shareId={item.share.id} disabled={item.status === 'revoked'} />
        </div>
      </header>

      <Alert>
        <ShieldCheck className="size-4" aria-hidden="true" />
        <AlertTitle>This share stores only a one-way secret hash</AlertTitle>
        <AlertDescription>
          The original recipient URL cannot be displayed or reconstructed here. Use the later rotate action to issue a new URL when needed.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Confirmed views" value={String(item.confirmedViews)} icon={<Eye className="size-4" aria-hidden="true" />} />
        <MetricCard label="Created" value={formatDate(item.share.created_at)} icon={<CalendarClock className="size-4" aria-hidden="true" />} />
        <MetricCard label="Expires" value={item.share.expires_at ? formatDate(item.share.expires_at) : 'Never'} icon={<CalendarClock className="size-4" aria-hidden="true" />} />
        <MetricCard label="Last viewed" value={item.lastViewedAt ? formatDate(item.lastViewedAt) : 'Never'} icon={<Eye className="size-4" aria-hidden="true" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Access settings</CardTitle>
            <CardDescription>Settings captured when this share was created.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Repository" value={repositoryName} mono />
              <DetailField label="Ref" value={item.share.ref} mono />
              <DetailField label="Notify on meaningful view" value={item.share.notify_on_view ? 'Enabled' : 'Disabled'} />
              <DetailField label="Downloads" value={item.share.allow_download ? 'Allowed' : 'Disabled'} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility policy</CardTitle>
            <CardDescription>Share rules narrow the repository policy and never widen it.</CardDescription>
          </CardHeader>
          <CardContent>
            <VisibilityRules rules={item.share.rules} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Note</CardTitle>
          <CardDescription>Private context for the owner.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-3 text-sm leading-6 text-foreground-muted">
          <FileText className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{item.share.note || 'No note was added to this share.'}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <SessionsCard sessions={sessions} />
        <NotificationsCard notifications={notifications} />
      </div>

      <ActivityCard activity={activity} />
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">{icon}{label}</div>
        <p className="font-heading text-xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-foreground-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-sm text-foreground' : 'text-sm text-foreground'}>{value}</dd>
    </div>
  )
}

function VisibilityRules({ rules }: { rules: unknown }) {
  const parsed = rules && typeof rules === 'object' ? rules as { hidden?: unknown; allowOnly?: unknown } : {}
  const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter((value): value is string => typeof value === 'string') : []
  const allowOnly = Array.isArray(parsed.allowOnly) ? parsed.allowOnly.filter((value): value is string => typeof value === 'string') : []

  return (
    <div className="space-y-4">
      <RuleList label="Hidden patterns" values={hidden} empty="No share-specific hidden patterns." />
      <RuleList label="Allow-only patterns" values={allowOnly} empty="No share-specific allow-only patterns." />
    </div>
  )
}

function RuleList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
      {values.length > 0 ? <div className="flex flex-wrap gap-2">{values.map((value) => <Badge key={value} variant="outline" className="font-mono text-[11px]">{value}</Badge>)}</div> : <p className="text-sm text-foreground-muted">{empty}</p>}
    </div>
  )
}

function SessionsCard({ sessions }: { sessions: ShareSessionSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Viewer sessions</CardTitle>
        <CardDescription>{sessions.length} recorded {sessions.length === 1 ? 'session' : 'sessions'}; only confirmed sessions count as views.</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? <EmptyDetailState text="No viewer sessions have been recorded." /> : (
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader><TableRow><TableHead>Session</TableHead><TableHead>First confirmed</TableHead><TableHead>Last seen</TableHead><TableHead>Duration</TableHead><TableHead>Context</TableHead><TableHead>Viewed paths</TableHead></TableRow></TableHeader>
              <TableBody>{sessions.map((session) => <SessionRow key={session.id} session={session} />)}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SessionRow({ session }: { session: ShareSessionSummary }) {
  const sessionLabel = session.confirmedAt ? 'Confirmed session' : session.isProbableBot ? 'Likely scanner' : 'Pending'
  const variant = session.confirmedAt ? 'success' : session.isProbableBot ? 'secondary' : 'outline'
  return (
    <TableRow>
      <TableCell><div className="space-y-1"><Badge variant={variant}>{sessionLabel}</Badge><p className="text-xs text-foreground-muted">Started {formatDateTime(session.firstSeenAt)}</p></div></TableCell>
      <TableCell className="whitespace-nowrap text-xs text-foreground-muted">{session.confirmedAt ? formatDateTime(session.confirmedAt) : 'Not confirmed'}</TableCell>
      <TableCell className="whitespace-nowrap text-xs text-foreground-muted">{formatDateTime(session.lastSeenAt)}</TableCell>
      <TableCell className="whitespace-nowrap text-xs text-foreground-muted">~{session.approximateDurationMinutes} min</TableCell>
      <TableCell><div className="flex items-center gap-2 text-xs text-foreground-muted"><Laptop className="size-3.5" aria-hidden="true" /><span>{[session.browser, session.os, session.deviceType, session.country].filter(Boolean).join(' · ') || 'Context unavailable'}</span></div></TableCell>
      <TableCell><div className="flex max-w-56 flex-wrap gap-1">{session.viewedPaths.length > 0 ? session.viewedPaths.map((path) => <Badge key={path} variant="outline" className="max-w-full truncate font-mono text-[10px]" title={path}>{path}</Badge>) : <span className="text-xs text-foreground-muted">None recorded</span>}</div></TableCell>
    </TableRow>
  )
}

function ActivityCard({ activity }: { activity: ShareDetailData['activity'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Recent share and viewer events. Link opens are recorded separately from confirmed views.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? <EmptyDetailState text="No activity has been recorded for this share." /> : (
          <div className="divide-y divide-border rounded-md border border-border">
            {activity.map((event) => (
              <div key={event.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="text-sm font-medium text-foreground">{formatEventType(event.eventType)}</p><p className="truncate font-mono text-xs text-foreground-muted">{event.path || 'Share lifecycle event'}</p></div>
                <time className="shrink-0 text-xs text-foreground-muted" dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotificationsCard({ notifications }: { notifications: ShareNotificationSummary[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification delivery</CardTitle>
        <CardDescription>Meaningful-view notification attempts for this share.</CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? <EmptyDetailState text="No notification delivery has been attempted." /> : (
          <div className="space-y-3">
            {notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotificationRow({ notification }: { notification: ShareNotificationSummary }) {
  const sent = notification.status === 'sent'
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      {sent ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />}
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{notification.channel} · {notification.status}</p><p className="mt-1 text-xs text-foreground-muted">{notification.errorText || (notification.sentAt ? `Sent ${formatDate(notification.sentAt)}` : `Attempted ${formatDate(notification.createdAt)}`)}</p></div>
      <Bell className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
    </div>
  )
}

function EmptyDetailState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-foreground-muted">{text}</p>
}

function formatEventType(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
