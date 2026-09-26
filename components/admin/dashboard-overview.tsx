import { Activity, ChevronDown, Clipboard, Download, Eye, FileCode2, FileText, Link2 } from 'lucide-react'
import Link from 'next/link'

import { OwnerPageHeader } from './owner-workspace-controls'
import type { DashboardOverview, DashboardOverviewActivity, DashboardOverviewTimePoint } from '@/lib/dashboard/overview'

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const viewsLast7Days = data.viewsOverTime.reduce((total, point) => total + point.value, 0)
  const latestActivity = data.recentActivity[0]

  return (
    <section className="mx-auto w-full max-w-6xl space-y-8 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <OwnerPageHeader
        title="Dashboard"
        description="See whether your private shares are active, who is engaging, and what changed most recently."
        meta={<span>Last 30 days <span className="px-1.5 text-foreground-muted/50">·</span> Anonymous viewers</span>}
        actions={<Link href="/dashboard/shares/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Link2 className="size-4" aria-hidden="true" /> New share</Link>}
      />

      <section aria-labelledby="workspace-summary" className="border-y border-border/70 py-4">
        <h2 id="workspace-summary" className="sr-only">Workspace summary</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border/60">
          <SummaryItem label="Active shares" value={data.activeShares} detail="ready for viewers" />
          <SummaryItem label="Anonymous viewers" value={data.uniqueAnonymousViewers} detail={formatReturningViewers(data.returningViewers)} />
          <SummaryItem label="Confirmed views" value={data.totalViews} detail={`+${viewsLast7Days} in the last 7 days`} />
          <SummaryItem label="Latest activity" value={latestActivity ? formatRelativeTime(latestActivity.createdAt) : 'None yet'} detail={latestActivity ? latestActivity.repositoryName : 'Share a repository to begin'} />
        </dl>
        <p className="mt-4 text-xs text-foreground-muted">
          {data.enabledRepositories} enabled {data.enabledRepositories === 1 ? 'repository' : 'repositories'} <span className="px-1.5 text-foreground-muted/50">·</span> {data.filesViewed} files viewed <span className="px-1.5 text-foreground-muted/50">·</span> {data.downloads} downloads <span className="px-1.5 text-foreground-muted/50">·</span> {data.copyEvents} copies
        </p>
      </section>

      <section aria-labelledby="recent-activity" className="overflow-hidden border-b border-border/70">
        <header className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <div>
            <h2 id="recent-activity" className="font-heading text-xl font-semibold tracking-[-0.025em]">Recent activity</h2>
            <p className="mt-1 text-sm text-foreground-muted">Meaningful actions from confirmed private-share sessions.</p>
          </div>
          <Link href="/dashboard/activity" className="inline-flex min-h-9 items-center gap-1.5 self-start rounded-md px-2 text-xs font-medium text-link transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto">View all activity <span aria-hidden="true">→</span></Link>
        </header>
        <div className="px-0">
          {data.recentActivity.length === 0 ? <EmptyActivity /> : <ActivityList items={data.recentActivity} />}
        </div>
      </section>

      {data.totalViews > 0 ? (
        <details className="group border-b border-border/60 pb-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>View trend <span className="ml-1.5 text-xs font-normal text-foreground-muted">Confirmed views over the last 7 days</span></span>
            <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-foreground-muted">{viewsLast7Days} views <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" /></span>
          </summary>
          <div className="pt-4"><ViewsOverTime points={data.viewsOverTime} totalViews={viewsLast7Days} /></div>
        </details>
      ) : null}
    </section>
  )
}

function SummaryItem({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="min-w-0 lg:px-5 first:pl-0 last:pr-0">
      <dt className="text-xs font-medium text-foreground-muted">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-heading text-xl font-semibold leading-none tabular-nums">{value}</span>
        <span className="truncate text-xs text-foreground-muted" title={detail}>{detail}</span>
      </dd>
    </div>
  )
}

function ViewsOverTime({ points, totalViews }: { points: DashboardOverviewTimePoint[]; totalViews: number }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1)

  return (
    <div className="border-y border-border/60 bg-muted/15 px-5 py-4 sm:px-6">
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
              <div className="w-full max-w-12 rounded-sm bg-primary/75 transition-[height] duration-200" style={{ height: point.value > 0 ? `${Math.max(12, (point.value / maxValue) * 100)}%` : '2px' }} />
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
  return <div className="px-4 py-12 text-center text-sm text-foreground-muted"><Activity className="mx-auto size-5 text-foreground-muted" aria-hidden="true" /><p className="mt-3">No confirmed activity has been recorded yet.</p><p className="mt-1 text-xs">Once someone opens a share, their anonymous session will appear here.</p></div>
}

function formatReturningViewers(value: number) {
  return value === 1 ? '1 returning' : `${value} returning`
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
