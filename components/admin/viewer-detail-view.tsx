import {
  Activity,
  ArrowLeft,
  Clock3,
  Copy,
  Eye,
  FileCode2,
  Laptop,
  Link2,
  MapPin,
  ShieldAlert,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, PageContainer, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import type { ViewerDetailData, ViewerSessionDetail } from '@/lib/dashboard/viewers'

export function ViewerDetailView({ data }: { data: ViewerDetailData }) {
  const { summary, viewer, sessions, activity, timeline } = data

  return (
    <PageContainer size="default" className="space-y-7 lg:py-10">
      <Link href="/dashboard/viewers" className="inline-flex items-center gap-2 text-xs font-medium text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline">
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to viewers
      </Link>

      <Card className="overflow-hidden rounded-md">
        <header className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5"><UserRound className="size-3.5" aria-hidden="true" />Anonymous viewer</Badge>
              <Badge variant="secondary">Unverified</Badge>
            </div>
            <h1 className="type-page-title mt-3">{summary.displayName}</h1>
            <p className="mt-2 text-sm text-foreground-muted">{summary.recipientLabel || 'Generic share'}{summary.company ? ` · ${summary.company}` : ''} · Intended label only</p>
            <p className="mt-1 text-xs text-foreground-muted">First seen {formatDate(viewer.firstSeenAt)} · Last seen {formatDate(viewer.lastSeenAt)}</p>
          </div>
          <div className="rounded-lg border border-border-secondary bg-surface-200/35 px-4 py-3 sm:min-w-36 lg:text-right">
            <p className="font-heading text-xl font-semibold tabular-nums">{summary.visits}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">{summary.visits === 1 ? 'recorded visit' : 'recorded visits'}</p>
          </div>
        </header>

        <div className="border-t border-border/60 bg-muted/18 px-3 py-3 sm:px-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={<Clock3 className="size-3.5" />} label="Active time" value={formatDuration(summary.totalViewingSeconds)} tone="primary" />
            <Stat icon={<FileCode2 className="size-3.5" />} label="Files viewed" value={String(summary.filesViewed)} />
            <Stat icon={<MapPin className="size-3.5" />} label="Approx. location" value={summary.location || 'Not available'} />
            <Stat icon={<Link2 className="size-3.5" />} label="Viewer ID" value={`#${viewer.code}`} mono />
          </div>
        </div>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-border-secondary bg-surface-200/30 px-4 py-3.5 text-sm leading-6 text-foreground-muted">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-foreground-light" aria-hidden="true" />
        <p>Recipient metadata is an intended-recipient label, not proof of who opened the URL. Any security language below is an inferred signal and may be wrong.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-md border border-border/70 bg-card p-1.5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Repository activity</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="device">Device</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab sessions={sessions} /></TabsContent>
        <TabsContent value="sessions"><SessionsTab sessions={sessions} /></TabsContent>
        <TabsContent value="activity"><ActivityTab activity={activity} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab timeline={timeline} /></TabsContent>
        <TabsContent value="location"><LocationTab sessions={sessions} /></TabsContent>
        <TabsContent value="device"><ContextTab title="Prompt-free browser and device context" icon={<Laptop className="size-4" />} values={sessions[0]?.device ?? {}} /></TabsContent>
        <TabsContent value="security"><SecurityTab sessions={sessions} /></TabsContent>
      </Tabs>
    </PageContainer>
  )
}

function Stat({ icon, label, value, mono = false, tone }: { icon: ReactNode; label: string; value: string; mono?: boolean; tone?: 'primary' }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/55 bg-card/75 px-3.5 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground-muted">
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${tone === 'primary' ? 'bg-surface-200 text-foreground-light' : 'bg-muted text-foreground-muted'}`} aria-hidden="true">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <p className={`mt-2 truncate text-sm font-semibold text-foreground ${mono ? 'font-mono text-xs' : ''}`} title={value}>{value}</p>
    </div>
  )
}

function OverviewTab({ sessions }: { sessions: ViewerSessionDetail[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <SessionsTab sessions={sessions} compact />
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Engagement pattern</CardTitle>
          <CardDescription>Observed file navigation across this viewer’s sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sessions.flatMap((session) => session.files).slice(0, 12).map((path, index) => (
              <div key={`${path}-${index}`} className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/30">
                <span className="w-6 shrink-0 font-mono text-xs text-foreground-muted">{String(index + 1).padStart(2, '0')}</span>
                <FileCode2 className="size-3.5 shrink-0 text-foreground-light" aria-hidden="true" />
                <span className="truncate font-mono text-xs" title={path}>{path}</span>
              </div>
            ))}
            {sessions.every((session) => session.files.length === 0) ? <Empty text="No file engagement has been recorded yet." /> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SessionsTab({ sessions, compact = false }: { sessions: ViewerSessionDetail[]; compact?: boolean }) {
  const visibleSessions = sessions.slice(0, compact ? 4 : undefined)

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>{sessions.length} recorded {sessions.length === 1 ? 'session' : 'sessions'}. Active time is estimated from foreground activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visibleSessions.map((session) => <ViewerSessionRow key={session.id} session={session} />)}
          {sessions.length === 0 ? <Empty text="No sessions have been recorded yet." /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ViewerSessionRow({ session }: { session: ViewerSessionDetail }) {
  const ended = Boolean(session.endedAt)
  return (
    <div className="rounded-lg border border-border/60 bg-muted/18 p-3.5 transition-colors hover:border-border-secondary hover:bg-accent/25 sm:p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm font-medium" title={session.shareLabel}>{session.shareLabel}</p>
            <Badge variant={ended ? 'secondary' : 'success'} className="gap-1.5"><span className={`size-1.5 rounded-full ${ended ? 'bg-foreground-muted' : 'bg-success'}`} aria-hidden="true" />{ended ? 'Ended' : 'Active'}</Badge>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-foreground-muted" title={session.repositoryName}>{session.repositoryName}</p>
          <p className="mt-1 text-xs text-foreground-muted">{formatDate(session.firstSeenAt)} → {formatDate(session.lastSeenAt)}</p>
        </div>
        <span className="shrink-0 rounded-md bg-surface-200 px-2 py-1 font-mono text-xs text-foreground-light">{formatDuration(session.activeSeconds)} active</span>
      </div>
      <dl className="mt-4 grid gap-3 border-t border-border/50 pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="First file" value={session.firstFile || 'None'} mono />
        <Detail label="Last file" value={session.lastFile || 'None'} mono />
        <Detail label="Ref" value={session.ref} mono />
        <Detail label="Commit" value={session.commitSha ? session.commitSha.slice(0, 12) : 'Not pinned'} mono />
      </dl>
    </div>
  )
}

function ActivityTab({ activity }: { activity: ViewerDetailData['activity'] }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Repository activity</CardTitle>
        <CardDescription>Semantic interactions only; raw keylogging is never collected.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {activity.map((event) => (
            <div key={event.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border/50 bg-muted/18 px-3 py-2.5 transition-colors hover:bg-accent/30">
              <ActivityIcon eventType={event.eventType} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium">{formatEvent(event.eventType)}</p>
                  <time className="shrink-0 text-xs text-foreground-muted" dateTime={event.createdAt}>{formatTime(event.createdAt)}</time>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-foreground-muted" title={event.path || 'Session activity'}>{event.path || 'Session activity'}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 ? <Empty text="No repository activity recorded yet." /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function TimelineTab({ timeline }: { timeline: ViewerDetailData['timeline'] }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>Activity timeline</CardTitle>
        <CardDescription>Chronological events from confirmed sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border/50 bg-muted/18 px-3 py-2.5 transition-colors hover:bg-accent/30">
              <ActivityIcon eventType={event.eventType} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium">{formatEvent(event.eventType)}</p>
                  <time className="shrink-0 text-xs text-foreground-muted" dateTime={event.occurredAt}>{formatTime(event.occurredAt)}</time>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-foreground-muted" title={event.path || 'Repository session'}>{event.path || 'Repository session'}</p>
              </div>
            </div>
          ))}
          {timeline.length === 0 ? <Empty text="No timeline events recorded yet." /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityIcon({ eventType }: { eventType: string }) {
  const normalized = eventType.toLowerCase()
  if (normalized.includes('copy')) return <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-200 text-foreground-light" aria-hidden="true"><Copy className="size-3.5" /></span>
  if (normalized.includes('file') || normalized.includes('markdown') || normalized.includes('directory')) return <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success" aria-hidden="true"><FileCode2 className="size-3.5" /></span>
  if (normalized.includes('view') || normalized.includes('open')) return <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-200 text-foreground-light" aria-hidden="true"><Eye className="size-3.5" /></span>
  return <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground-muted" aria-hidden="true"><Activity className="size-3.5" /></span>
}

function LocationTab({ sessions }: { sessions: ViewerSessionDetail[] }) {
  const location = sessions[0]?.location
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle><MapPin className="mr-2 inline size-4 text-foreground-light" />Approximate location</CardTitle>
        <CardDescription>Coarse provider-supplied labels only. RepoView does not store postal codes or coordinates.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-3">
          {Object.entries({ City: location?.city, Region: location?.region, Country: location?.country }).map(([label, value]) => <Detail key={label} label={label} value={value ?? 'Not available'} />)}
        </dl>
      </CardContent>
    </Card>
  )
}

function ContextTab({ title, icon, values }: { title: string; icon: ReactNode; values: Record<string, string | number | boolean | null> }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle>{icon}<span className="ml-2">{title}</span></CardTitle>
        <CardDescription>Only prompt-free browser/session context is shown.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(values).map(([label, value]) => <Detail key={label} label={label.replaceAll(/([A-Z])/g, ' $1')} value={value === null || value === undefined ? 'Not available' : String(value)} />)}</dl>
      </CardContent>
    </Card>
  )
}

function SecurityTab({ sessions }: { sessions: ViewerSessionDetail[] }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle><ShieldAlert className="mr-2 inline size-4 text-foreground-light" />Security signals</CardTitle>
        <CardDescription>Signals are inferred and may be incorrect. “Possible link forwarding” is not a claim of identity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sessions.map((session) => <div key={session.id} className="rounded-lg border border-border/60 bg-muted/18 p-3.5"><p className="text-sm font-medium">{formatDate(session.firstSeenAt)}</p><pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-foreground-muted">{formatSecurity(session.security)}</pre></div>)}
          {sessions.length === 0 ? <Empty text="No security signals recorded." /> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0"><dt className="text-xs text-foreground-muted">{label}</dt><dd className={`mt-1 break-words text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`} title={value}>{value}</dd></div>
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-border/55 bg-muted/18 px-4 py-8 text-center text-sm text-foreground-muted">{text}</div>
}

function formatEvent(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function formatDate(value: string) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatTime(value: string) { return new Intl.DateTimeFormat('en', { timeStyle: 'medium' }).format(new Date(value)) }
function formatDuration(seconds: number) { if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m` }
function formatSecurity(value: unknown) { if (!value || typeof value !== 'object') return 'No inferred signals recorded.'; const entries = Object.entries(value as Record<string, unknown>).filter(([, field]) => field !== null && field !== false && field !== undefined); return entries.length > 0 ? entries.map(([key, field]) => `${key}: ${String(field)}`).join('\n') : 'No meaningful security signals recorded.' }
