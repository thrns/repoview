import { Activity, Clipboard, Download, Eye, FileCode2, FileText } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import type { DashboardOverview, DashboardOverviewActivity, DashboardOverviewTimePoint } from '@/lib/dashboard/overview'

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const viewsThisWeek = data.viewsOverTime.reduce((total, point) => total + point.value, 0)
  const averageViewingSeconds = data.totalViews > 0 ? Math.round(data.totalActiveViewingSeconds / data.totalViews) : 0

  return (
    <section className="mx-auto w-full max-w-6xl space-y-7 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-foreground-muted">Workspace overview</p>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-[2.15rem]">Dashboard</h1>
          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
            See how recipients are reviewing your private repository shares.
          </p>
        </div>
        <p className="shrink-0 pb-1 text-xs text-foreground-muted">Last 30 days <span className="px-1.5 text-foreground-muted/50">·</span> Anonymous IDs</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Unique viewers" value={data.uniqueAnonymousViewers} detail={formatReturningViewers(data.returningViewers)} />
        <MetricCard label="Total views" value={data.totalViews} detail={`+${viewsThisWeek} this week`} />
        <MetricCard label="Active time" value={formatDuration(data.totalActiveViewingSeconds)} detail={averageViewingSeconds > 0 ? `avg. ${formatDuration(averageViewingSeconds)}/view` : 'No confirmed views yet'} />
        <MetricCard label="Files viewed" value={data.filesViewed} detail="Unique session/file views" />
      </div>

      <SecondaryStats data={data} />

      <Card className="overflow-hidden rounded-md border-border/70 shadow-none">
        <CardHeader className="gap-1 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <span className="font-mono text-[11px] text-foreground-muted">{data.recentActivity.length} latest groups</span>
          </div>
          <CardDescription>Meaningful actions from confirmed private-share sessions.</CardDescription>
        </CardHeader>
        {data.totalViews > 0 ? <ViewsOverTime points={data.viewsOverTime} totalViews={viewsThisWeek} /> : null}
        <CardContent className="p-0">
          {data.recentActivity.length === 0 ? <EmptyActivity /> : <ActivityList items={data.recentActivity} />}
        </CardContent>
      </Card>
    </section>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return (
    <Card className="rounded-md border-border/70 shadow-none">
      <CardContent className="px-4 py-4 sm:px-5 sm:py-[18px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-foreground-muted">{label}</p>
        <p className="mt-3 font-heading text-[2rem] font-semibold leading-none tracking-[-0.045em] tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-foreground-muted">{detail}</p>
      </CardContent>
    </Card>
  )
}

function SecondaryStats({ data }: { data: DashboardOverview }) {
  const stats = [
    { label: 'Active shares', value: data.activeShares, detail: 'Enabled links' },
    { label: 'Downloads', value: data.downloads, detail: 'Recorded events' },
    { label: 'Copies', value: data.copyEvents, detail: 'Recorded events' },
    { label: 'Repositories', value: data.enabledRepositories, detail: 'Enabled' },
  ]

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border/60 rounded-md border border-border/70 bg-muted/20 sm:grid-cols-4 sm:divide-y-0">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-baseline justify-between gap-3 px-4 py-3 sm:block sm:px-5">
          <div>
            <p className="text-xs font-medium text-foreground-muted">{stat.label}</p>
            <p className="mt-1 font-heading text-lg font-semibold leading-none tabular-nums">{stat.value}</p>
          </div>
          <p className="text-[11px] text-foreground-muted sm:mt-1">{stat.detail}</p>
        </div>
      ))}
    </div>
  )
}

function ViewsOverTime({ points, totalViews }: { points: DashboardOverviewTimePoint[]; totalViews: number }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  return (
    <div className="border-b border-border/60 px-5 py-4 sm:px-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Views over time</h3>
          <p className="mt-1 text-xs text-foreground-muted">Confirmed views, last 7 days</p>
        </div>
        <span className="font-mono text-xs tabular-nums text-foreground-muted">{totalViews} total</span>
      </div>
      <div className="mt-4 grid h-20 grid-cols-7 items-end gap-2 sm:gap-3" aria-label="Views over the last seven days">
        {points.map((point) => (
          <div key={point.label} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
            <span className="sr-only">{point.label}: {point.value} views</span>
            <div className="flex h-full w-full items-end justify-center">
              <div className="w-full max-w-12 rounded-sm bg-foreground/75 transition-[height] duration-200" style={{ height: point.value > 0 ? `${Math.max(12, (point.value / maxValue) * 100)}%` : '2px' }} />
            </div>
            <span className="text-[10px] text-foreground-muted">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActivityList({ items }: { items: DashboardOverviewActivity[] }) {
  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const action = formatAction(item)
        return (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-3 sm:px-6">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <ActivityIcon eventType={item.eventType} />
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {action.prefix}{action.target ? <> <code className="font-mono text-[0.9em]">{action.target}</code></> : null}{action.suffix ? ` ${action.suffix}` : ''}
                </p>
                {item.eventCount > 1 ? <span className="shrink-0 font-mono text-[10px] text-foreground-muted">×{item.eventCount}</span> : null}
              </div>
              <p className="mt-1 truncate pl-5 text-[11px] text-foreground-muted">
                <span className="font-mono">{item.viewerLabel}</span><span className="px-1.5 text-foreground-muted/50">·</span><span className="font-mono">{item.repositoryName}</span>
              </p>
            </div>
            <time className="pt-0.5 text-right text-[11px] text-foreground-muted" dateTime={item.createdAt} title={formatDate(item.createdAt)}>{formatRelativeTime(item.createdAt)}</time>
          </div>
        )
      })}
    </div>
  )
}

function ActivityIcon({ eventType }: { eventType: string }) {
  const Icon = eventType === 'download' ? Download : eventType === 'copy' ? Clipboard : eventType === 'markdown_viewed' ? FileText : eventType === 'file_viewed' || eventType === 'raw_file_viewed' ? FileCode2 : eventType === 'view_confirmed' ? Eye : Activity
  return <Icon className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />
}

function formatAction(item: DashboardOverviewActivity) {
  const path = item.path || 'repository'
  const lineCount = typeof item.metadata.line_count === 'number' ? Math.max(1, Math.round(item.metadata.line_count)) : null

  if (item.eventType === 'download') return { prefix: 'Downloaded', target: path, suffix: '' }
  if (item.eventType === 'copy') return { prefix: lineCount ? `Copied ${lineCount} lines from` : 'Copied', target: path, suffix: '' }
  if (item.eventType === 'markdown_viewed') return { prefix: 'Opened', target: path, suffix: '' }
  if (item.eventType === 'file_opened') return { prefix: 'Opened', target: path, suffix: '' }
  if (item.eventType === 'directory_opened' || item.eventType === 'directory_viewed') return { prefix: 'Opened', target: path, suffix: '' }
  if (item.eventType === 'view_confirmed') return { prefix: 'Viewed', target: 'repository', suffix: '' }
  if (item.eventType === 'file_viewed' || item.eventType === 'raw_file_viewed' || item.eventType === 'image_viewed') return { prefix: 'Viewed', target: path, suffix: '' }
  return { prefix: item.eventType.replaceAll('_', ' '), target: item.path, suffix: '' }
}

function EmptyActivity() {
  return <div className="px-6 py-12 text-center text-sm text-foreground-muted">No confirmed activity has been recorded yet.</div>
}

function formatReturningViewers(value: number) {
  return value === 1 ? '1 returning' : `${value} returning`
}

function formatDuration(seconds: number) {
  const roundedSeconds = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const remainder = roundedSeconds % 60
  if (minutes === 0) return `${remainder}s`
  if (minutes < 60) return `${minutes}m${remainder > 0 ? ` ${remainder}s` : ''}`
  const hours = Math.floor(minutes / 60)
  return `${hours}h${minutes % 60 > 0 ? ` ${minutes % 60}m` : ''}`
}

function formatRelativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime()
  const seconds = Math.max(0, Math.floor(delta / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
