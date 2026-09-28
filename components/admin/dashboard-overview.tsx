import { Activity, ArrowRight, BarChart3, Clipboard, Download, Eye, FileCode2, FileText, GitBranch, Link2, Users } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Card } from '@/components/ui'
import { OwnerPageHeader } from './owner-workspace-controls'
import type { DashboardOverview, DashboardOverviewActivity, DashboardOverviewTimePoint } from '@/lib/dashboard/overview'

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const viewsLast7Days = data.viewsOverTime.reduce((total, point) => total + point.value, 0)

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <OwnerPageHeader
        title="Dashboard"
        description="Monitor private-share activity, viewers, and the latest changes in your workspace."
        actions={<Link href="/dashboard/shares/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"><Link2 className="size-4" aria-hidden="true" /> New share</Link>}
      />

      <section aria-labelledby="workspace-summary" className="space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="workspace-summary" className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Workspace snapshot</h2>
          <span className="text-xs tabular-nums text-foreground-muted">Last 30 days</span>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Active shares" value={data.activeShares} detail={data.activeShares === 0 ? 'No active shares yet' : 'Ready for viewers'} icon={<Link2 className="size-4" aria-hidden="true" />} />
          <SummaryMetric label="Anonymous viewers" value={data.uniqueAnonymousViewers} detail={data.uniqueAnonymousViewers === 0 ? 'Waiting for sessions' : formatReturningViewers(data.returningViewers)} icon={<Users className="size-4" aria-hidden="true" />} />
          <SummaryMetric label="Confirmed views" value={data.totalViews} detail={viewsLast7Days === 0 ? 'No views in the last 7 days' : `${viewsLast7Days} in the last 7 days`} icon={<Eye className="size-4" aria-hidden="true" />} />
          <SummaryMetric label="Enabled repositories" value={data.enabledRepositories} detail={data.enabledRepositories === 0 ? 'Connect a repository to begin' : 'Available for private shares'} icon={<GitBranch className="size-4" aria-hidden="true" />} />
        </dl>
        <WorkspaceSignals data={data} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.65fr)] xl:items-start">
        <Card className="overflow-hidden">
          <section aria-labelledby="recent-activity">
            <header className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-md border border-primary/15 bg-primary-soft text-primary-readable"><Activity className="size-3.5" aria-hidden="true" /></span>
                  <h2 id="recent-activity" className="font-heading text-xl font-semibold tracking-[-0.025em]">Recent activity</h2>
                </div>
                <p className="mt-2 text-sm text-foreground-muted">Meaningful actions from confirmed private-share sessions.</p>
              </div>
              <Link href="/dashboard/activity" className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md px-2 text-xs font-medium text-link transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto">View all activity <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
            </header>
            {data.recentActivity.length === 0 ? <EmptyActivity hasActiveShare={data.activeShares > 0} /> : <ActivityList items={data.recentActivity} />}
          </section>
        </Card>

        <ViewsTrendCard points={data.viewsOverTime} totalViews={viewsLast7Days} />
      </div>
    </section>
  )
}

function SummaryMetric({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: ReactNode }) {
  return (
    <Card className="group flex min-h-36 flex-col justify-between p-4 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-border-strong hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <dt className="min-w-0 text-xs font-medium text-foreground-muted">{label}</dt>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary-soft text-primary-readable transition-colors group-hover:border-primary/25 group-hover:bg-accent">{icon}</span>
      </div>
      <div>
        <dd className="mt-5 font-heading text-3xl font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</dd>
        <p className="mt-2 truncate text-xs text-foreground-muted" title={detail}>{detail}</p>
      </div>
    </Card>
  )
}

function WorkspaceSignals({ data }: { data: DashboardOverview }) {
  const latestActivity = data.recentActivity[0]

  return (
    <div className="rounded-lg border border-border/60 bg-muted/35 px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card text-foreground-muted"><BarChart3 className="size-3.5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium">Workspace signals</p>
            <p className="mt-0.5 text-xs text-foreground-muted">Supporting context for your recent share activity</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:flex lg:items-center lg:gap-6">
          <SignalItem label="Files viewed" value={data.filesViewed} />
          <SignalItem label="Downloads" value={data.downloads} />
          <SignalItem label="Copies" value={data.copyEvents} />
          <div className="min-w-0 lg:border-l lg:border-border/60 lg:pl-6">
            <p className="text-[11px] text-foreground-muted">Last activity</p>
            <p className="mt-1 truncate text-xs font-medium" title={latestActivity?.repositoryName}>{latestActivity ? formatRelativeTime(latestActivity.createdAt) : 'None yet'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignalItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-foreground-muted">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function ViewsTrendCard({ points, totalViews }: { points: DashboardOverviewTimePoint[]; totalViews: number }) {
  return (
    <Card className="overflow-hidden">
      <section aria-labelledby="view-trend">
        <header className="flex items-start justify-between gap-4 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary-soft text-primary-readable"><BarChart3 className="size-3.5" aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 id="view-trend" className="font-heading text-lg font-semibold tracking-[-0.025em]">View trend</h2>
              <p className="mt-1 text-xs text-foreground-muted">Confirmed views, last 7 days</p>
            </div>
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-foreground-muted">{totalViews} total</span>
        </header>
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {totalViews > 0 ? <ViewsOverTime points={points} /> : <EmptyTrend />}
        </div>
      </section>
    </Card>
  )
}

function ViewsOverTime({ points }: { points: DashboardOverviewTimePoint[] }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const chartDescription = points.map((point) => `${point.label}: ${point.value}`).join(', ')

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-[11px] text-foreground-muted">
        <span>Daily confirmed views</span>
      </div>
      <div className="relative mt-4 pl-7">
        <span className="absolute left-0 top-0 font-mono text-[10px] tabular-nums text-foreground-muted">{maxValue}</span>
        <span className="absolute bottom-6 left-0 font-mono text-[10px] tabular-nums text-foreground-muted">0</span>
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/70" />
        <div className="pointer-events-none absolute inset-x-0 bottom-6 border-t border-border/70" />
        <div role="img" aria-label={`Confirmed views by day: ${chartDescription}`} className="grid h-36 grid-cols-7 items-end gap-2">
          {points.map((point) => (
            <div key={point.label} className="group flex h-full min-w-0 flex-col items-center justify-end gap-1.5" title={`${point.label}: ${point.value} confirmed ${point.value === 1 ? 'view' : 'views'}`}>
              <span className="font-mono text-[10px] tabular-nums text-foreground-muted">{point.value > 0 ? point.value : '\u00a0'}</span>
              <div className="flex h-[calc(100%-1rem)] w-full items-end justify-center">
                <div className="w-full max-w-10 rounded-t-sm bg-primary transition-[height,background-color] duration-150 group-hover:bg-primary/85" style={{ height: point.value > 0 ? `${Math.max(12, (point.value / maxValue) * 100)}%` : '2px' }} />
              </div>
              <span className="sr-only">{point.label}: {point.value} views</span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2" aria-hidden="true">
          {points.map((point) => <span key={point.label} className="truncate text-center text-[10px] text-foreground-muted">{point.label}</span>)}
        </div>
      </div>
    </div>
  )
}

function EmptyTrend() {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed border-border-strong/70 bg-muted/20 px-5 text-center">
      <span className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-card text-foreground-muted"><BarChart3 className="size-4" aria-hidden="true" /></span>
      <p className="mt-3 text-sm font-medium">No confirmed views yet</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-foreground-muted">The last seven days will take shape here as viewers open a private share.</p>
    </div>
  )
}

function ActivityList({ items }: { items: DashboardOverviewActivity[] }) {
  return (
    <div className="divide-y divide-border/60">
      {items.map((item) => {
        const action = formatAction(item)
        return (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4 transition-colors hover:bg-muted/25 sm:px-6">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <ActivityIcon eventType={item.eventType} />
                <p className="min-w-0 truncate text-sm font-medium text-foreground">
                  {action.prefix}{action.target ? <> <code className="font-mono text-[0.9em]">{action.target}</code></> : null}{action.suffix ? ` ${action.suffix}` : ''}
                </p>
                {item.eventCount > 1 ? <span className="shrink-0 font-mono text-[10px] tabular-nums text-foreground-muted">×{item.eventCount}</span> : null}
              </div>
              <p className="mt-1.5 truncate pl-9 text-[11px] text-foreground-muted" title={`${item.viewerLabel} · ${item.repositoryName}`}>
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
  const tone = eventType === 'view_confirmed' ? 'border-success/20 bg-success/10 text-success' : eventType === 'download' || eventType === 'copy' ? 'border-primary/15 bg-primary-soft text-primary-readable' : 'border-border/70 bg-muted text-foreground-muted'
  return <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-md border ${tone}`}><Icon className="size-3.5" aria-hidden="true" /></span>
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

function EmptyActivity({ hasActiveShare }: { hasActiveShare: boolean }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center sm:py-14">
      <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/70 bg-muted/45 text-foreground-muted"><Activity className="size-5" aria-hidden="true" /></span>
      <p className="mt-4 text-sm font-medium">Waiting for the first viewer session</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-foreground-muted">Confirmed opens and file actions will appear here with repository context and timing.</p>
      <Link href={hasActiveShare ? '/dashboard/shares' : '/dashboard/shares/new'} className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-strong/70 bg-card px-3 text-xs font-medium text-foreground transition-[background-color,border-color,color] duration-150 hover:border-primary/30 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{hasActiveShare ? 'Open shares' : 'Create your first share'} <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>
  )
}

function formatReturningViewers(value: number) {
  return value === 1 ? '1 returning viewer' : `${value} returning viewers`
}

function formatRelativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
