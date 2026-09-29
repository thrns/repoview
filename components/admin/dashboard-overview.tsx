import {
  Activity,
  ArrowRight,
  BarChart3,
  Clipboard,
  Clock3,
  Download,
  Eye,
  FileCode2,
  FileText,
  GitBranch,
  Link2,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Badge, Card, PageContainer } from '@/components/ui'
import type {
  DashboardMetricTrend,
  DashboardOverview,
  DashboardOverviewActivity,
  DashboardOverviewTimePoint,
  DashboardRange,
} from '@/lib/dashboard/overview'

export function DashboardOverviewView({ data }: { data: DashboardOverview }) {
  const signalSeries = data.workspaceSignalsOverTime

  return (
    <PageContainer size="default" className="space-y-4 sm:space-y-5">
      <section aria-labelledby="workspace-summary">
        <h1 id="workspace-summary" className="sr-only">Workspace overview</h1>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            label="Active shares"
            value={data.activeShares}
            detail={data.activeShares === 0 ? 'No active shares yet' : 'Ready for viewers'}
            icon={<Link2 className="size-4" aria-hidden="true" />}
          />
          <DashboardMetricCard
            label="Anonymous viewers"
            value={data.uniqueAnonymousViewers}
            detail={data.uniqueAnonymousViewers === 0 ? 'Waiting for sessions' : formatReturningViewers(data.returningViewers)}
            icon={<Users className="size-4" aria-hidden="true" />}
            trend={data.metricTrends.anonymousViewers}
            sparkline={signalSeries.map((point) => point.uniqueViewers)}
            sparklineLabel="Daily unique viewers"
          />
          <DashboardMetricCard
            label="Confirmed views"
            value={data.totalViews}
            detail={data.totalViews === 0 ? `No views in the last ${getRangeLabel(data.range)}` : `Confirmed in the last ${getRangeLabel(data.range)}`}
            icon={<Eye className="size-4" aria-hidden="true" />}
            trend={data.metricTrends.confirmedViews}
            sparkline={data.viewsOverTime.map((point) => point.value)}
            sparklineLabel="Daily confirmed views"
          />
          <DashboardMetricCard
            label="Enabled repositories"
            value={data.enabledRepositories}
            detail={data.enabledRepositories === 0 ? 'Connect a repository to begin' : 'Available for private shares'}
            icon={<GitBranch className="size-4" aria-hidden="true" />}
          />
        </dl>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <WorkspaceSignalsCard data={data} />
        <LastActivityCard items={data.recentActivity} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RecentActivityCard items={data.recentActivity} hasActiveShare={data.activeShares > 0} />
        <ViewsTrendCard data={data} />
        <TopRepositoriesCard repositories={data.topRepositories} />
      </div>
    </PageContainer>
  )
}

function DashboardMetricCard({
  label,
  value,
  detail,
  icon,
  trend,
  sparkline,
  sparklineLabel,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  trend?: DashboardMetricTrend
  sparkline?: number[]
  sparklineLabel?: string
}) {
  return (
    <Card className="min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">{icon}</span>
          <dt className="truncate text-xs font-medium text-foreground-muted">{label}</dt>
        </div>
        {trend ? <MetricTrend trend={trend} /> : null}
      </div>
      <dd className="mt-4 font-heading text-2xl font-semibold leading-none tracking-tight tabular-nums">{formatNumber(value)}</dd>
      <p className="mt-2 truncate text-xs text-foreground-muted" title={detail}>{detail}</p>
      {sparkline && sparklineLabel ? <MiniBars values={sparkline} label={sparklineLabel} className="mt-3" /> : null}
    </Card>
  )
}

function MetricTrend({ trend }: { trend: DashboardMetricTrend }) {
  const label = formatTrend(trend)
  const variant = trend.changePercent !== null && trend.changePercent > 0 ? 'success' : 'secondary'

  return <Badge variant={variant} className="shrink-0 px-1.5 py-0 font-mono text-[10px] tabular-nums" aria-label={`Compared with the previous period: ${label}`}>{label}</Badge>
}

function WorkspaceSignalsCard({ data }: { data: DashboardOverview }) {
  const signals: Array<{ label: string; value: number; icon: ReactNode; values: number[]; description: string }> = [
    { label: 'Files viewed', value: data.filesViewed, icon: <FileCode2 className="size-3.5" aria-hidden="true" />, values: data.workspaceSignalsOverTime.map((point) => point.filesViewed), description: 'Unique file/session views' },
    { label: 'Downloads', value: data.downloads, icon: <Download className="size-3.5" aria-hidden="true" />, values: data.workspaceSignalsOverTime.map((point) => point.downloads), description: 'Download events' },
    { label: 'Copies', value: data.copyEvents, icon: <Clipboard className="size-3.5" aria-hidden="true" />, values: data.workspaceSignalsOverTime.map((point) => point.copies), description: 'Copy events' },
    { label: 'Unique viewers', value: data.uniqueAnonymousViewers, icon: <Users className="size-3.5" aria-hidden="true" />, values: data.workspaceSignalsOverTime.map((point) => point.uniqueViewers), description: 'Confirmed viewer identities' },
  ]

  return (
    <Card className="min-w-0">
      <section aria-labelledby="workspace-signals">
        <DashboardCardHeader
          id="workspace-signals"
          icon={<BarChart3 className="size-3.5" aria-hidden="true" />}
          title="Workspace signals"
          description="Overview of share activity and file interactions in your workspace."
          action={<DashboardRangeSelector range={data.range} />}
        />
        <div className="grid grid-cols-2 divide-y divide-border-secondary sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {signals.map((signal) => (
            <div key={signal.label} className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-center gap-2 text-xs text-foreground-muted">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">{signal.icon}</span>
                <span className="truncate">{signal.label}</span>
              </div>
              <p className="mt-3 font-heading text-xl font-semibold tabular-nums">{formatNumber(signal.value)}</p>
              <p className="mt-1 truncate text-[11px] text-foreground-muted" title={signal.description}>{signal.description}</p>
              <MiniBars values={signal.values} label={`${signal.label} by day`} className="mt-3" />
            </div>
          ))}
        </div>
      </section>
    </Card>
  )
}

function LastActivityCard({ items }: { items: DashboardOverviewActivity[] }) {
  return (
    <Card className="min-w-0">
      <section aria-labelledby="last-activity">
        <DashboardCardHeader
          id="last-activity"
          icon={<Clock3 className="size-3.5" aria-hidden="true" />}
          title="Last activity"
          description="Your most recent share activity across repositories."
          action={<ViewAllLink />}
        />
        {items.length === 0 ? <CompactEmptyState icon={<Activity className="size-4" aria-hidden="true" />} title="No activity yet" description="Activity will appear here once someone opens a private share." /> : <ActivityList items={items} limit={5} compact />}
      </section>
    </Card>
  )
}

function RecentActivityCard({ items, hasActiveShare }: { items: DashboardOverviewActivity[]; hasActiveShare: boolean }) {
  return (
    <Card className="min-w-0">
      <section aria-labelledby="recent-activity">
        <DashboardCardHeader
          id="recent-activity"
          icon={<Activity className="size-3.5" aria-hidden="true" />}
          title="Recent activity"
          description="Meaningful actions from confirmed private-share sessions."
          action={<ViewAllLink />}
        />
        {items.length === 0 ? <EmptyActivity hasActiveShare={hasActiveShare} /> : <ActivityList items={items} limit={6} compact />}
      </section>
    </Card>
  )
}

function ViewsTrendCard({ data }: { data: DashboardOverview }) {
  const totalViews = data.viewsOverTime.reduce((total, point) => total + point.value, 0)
  const rangeLabel = getRangeLabel(data.range)

  return (
    <Card className="min-w-0">
      <section aria-labelledby="view-trend">
        <DashboardCardHeader
          id="view-trend"
          icon={<BarChart3 className="size-3.5" aria-hidden="true" />}
          title="View trend"
          description={`Confirmed views, last ${rangeLabel}`}
          action={<span className="shrink-0 font-mono text-xs tabular-nums text-foreground-muted">{formatNumber(totalViews)} total</span>}
        />
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {totalViews > 0 ? <ViewsOverTime points={data.viewsOverTime} /> : <EmptyTrend range={data.range} />}
        </div>
      </section>
    </Card>
  )
}

function TopRepositoriesCard({ repositories }: { repositories: DashboardOverview['topRepositories'] }) {
  return (
    <Card className="min-w-0">
      <section aria-labelledby="top-shared-repositories">
        <DashboardCardHeader
          id="top-shared-repositories"
          icon={<GitBranch className="size-3.5" aria-hidden="true" />}
          title="Top shared repositories"
          description="Repositories with the most confirmed views."
        />
        {repositories.length === 0 ? (
          <CompactEmptyState
            icon={<GitBranch className="size-4" aria-hidden="true" />}
            title="No repository view data yet"
            description="Repositories will be ranked after confirmed private-share views."
            action={<Link href="/dashboard/repositories" className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border-control bg-surface-100 px-2.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open repositories <ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
          />
        ) : (
          <ol className="divide-y divide-border-secondary">
            {repositories.map((repository, index) => {
              const proportion = (repository.confirmedViews / repositories[0].confirmedViews) * 100
              return (
                <li key={repository.repositoryId}>
                  <Link href="/dashboard/repositories" className="group block px-4 py-3.5 transition-colors hover:bg-surface-200/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-200 font-mono text-[11px] tabular-nums text-foreground-muted">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground-light group-hover:text-foreground">{repository.repositoryName}</span>
                      <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-foreground">{formatNumber(repository.confirmedViews)} {repository.confirmedViews === 1 ? 'view' : 'views'}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-200" aria-hidden="true"><span className="block h-full rounded-full bg-brand-default/70" style={{ width: `${proportion}%` }} /></div>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </Card>
  )
}

function DashboardCardHeader({ id, icon, title, description, action }: { id: string; icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-border-secondary px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">{icon}</span>
        <div className="min-w-0">
          <h2 id={id} className="font-heading text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-4 text-foreground-muted">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

function DashboardRangeSelector({ range }: { range: DashboardRange }) {
  return (
    <nav aria-label="Dashboard time range" className="flex items-center rounded-md border border-border-control bg-surface-100 p-0.5">
      {(['7d', '30d'] as const).map((option) => (
        <Link
          key={option}
          href={`/dashboard?range=${option}`}
          aria-current={range === option ? 'page' : undefined}
          className={`inline-flex min-h-7 items-center rounded-sm px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${range === option ? 'bg-surface-200 text-foreground' : 'text-foreground-muted hover:bg-surface-200/70 hover:text-foreground'}`}
        >
          {option === '7d' ? 'Last 7 days' : 'Last 30 days'}
        </Link>
      ))}
    </nav>
  )
}

function ViewAllLink() {
  return <Link href="/dashboard/activity" className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-link transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View all <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
}

function MiniBars({ values, label, className = '' }: { values: number[]; label: string; className?: string }) {
  const maxValue = Math.max(...values, 0)
  if (maxValue === 0) return null

  return (
    <div role="img" aria-label={`${label}: ${values.join(', ')}`} className={`flex h-6 items-end gap-0.5 ${className}`}>
      {values.map((value, index) => (
        <span key={`${label}-${index}`} className="min-w-0 flex-1 rounded-xs bg-brand-default/60" style={{ height: value > 0 ? `${Math.max(14, (value / maxValue) * 100)}%` : '2px' }} />
      ))}
      <span className="sr-only">{label}: {values.join(', ')}</span>
    </div>
  )
}

function ViewsOverTime({ points }: { points: DashboardOverviewTimePoint[] }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const labelEvery = points.length <= 7 ? 1 : 5
  const chartDescription = points.map((point) => `${point.label}: ${point.value}`).join(', ')

  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs text-foreground-muted"><span>Daily confirmed views</span><span className="font-mono tabular-nums">{maxValue} max</span></div>
      <div className="relative mt-3 pl-1">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border-secondary" />
        <div role="img" aria-label={`Confirmed views by day: ${chartDescription}`} className="relative grid h-32 items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((point) => (
            <div key={point.label + point.value} className="group flex h-full min-w-0 flex-col items-center justify-end gap-1" title={`${point.label}: ${point.value} confirmed ${point.value === 1 ? 'view' : 'views'}`}>
              <div className="flex h-[calc(100%-0.75rem)] w-full items-end justify-center"><span className="w-full max-w-7 rounded-t-sm bg-brand-default/75 transition-colors group-hover:bg-brand-default" style={{ height: point.value > 0 ? `${Math.max(10, (point.value / maxValue) * 100)}%` : '2px' }} /></div>
              <span className="sr-only">{point.label}: {point.value} views</span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-1.5" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((point, index) => <span key={`${point.label}-${index}`} className="truncate text-center text-[10px] text-foreground-muted">{index % labelEvery === 0 || index === points.length - 1 ? point.label : '\u00a0'}</span>)}
        </div>
      </div>
    </div>
  )
}

function ActivityList({ items, limit, compact = false }: { items: DashboardOverviewActivity[]; limit?: number; compact?: boolean }) {
  return (
    <ul className="divide-y divide-border-secondary">
      {items.slice(0, limit).map((item) => {
        const action = formatAction(item)
        return (
          <li key={item.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 transition-colors hover:bg-surface-200/45 ${compact ? 'px-4 py-3 sm:px-5' : 'px-4 py-4 sm:px-5'}`}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <ActivityIcon eventType={item.eventType} />
                <p className="min-w-0 truncate text-xs font-medium text-foreground">
                  {action.prefix}{action.target ? <> <code className="font-mono text-[11px]">{action.target}</code></> : null}{action.suffix ? ` ${action.suffix}` : ''}
                </p>
                {item.eventCount > 1 ? <span className="shrink-0 font-mono text-[11px] tabular-nums text-foreground-muted">×{item.eventCount}</span> : null}
              </div>
              <p className="mt-1.5 truncate pl-8 text-[11px] text-foreground-muted" title={`${item.viewerLabel} · ${item.repositoryName}`}><span className="font-mono">{item.viewerLabel}</span><span className="px-1.5 text-foreground-muted/50">·</span><span className="font-mono">{item.repositoryName}</span></p>
            </div>
            <time className="pt-0.5 text-right text-[11px] text-foreground-muted" dateTime={item.createdAt} title={formatDate(item.createdAt)}>{formatRelativeTime(item.createdAt)}</time>
          </li>
        )
      })}
    </ul>
  )
}

function ActivityIcon({ eventType }: { eventType: string }) {
  const Icon = eventType === 'download' ? Download : eventType === 'copy' ? Clipboard : eventType === 'markdown_viewed' ? FileText : eventType === 'file_viewed' || eventType === 'raw_file_viewed' ? FileCode2 : eventType === 'view_confirmed' ? Eye : Activity
  const tone = eventType === 'view_confirmed' ? 'border-success/20 bg-success/10 text-success' : eventType === 'download' || eventType === 'copy' ? 'border-border-secondary bg-surface-200 text-foreground-light' : 'border-border-secondary bg-surface-200 text-foreground-muted'
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
    <div className="flex flex-col items-center px-4 py-8 text-center sm:px-5">
      <span className="inline-flex size-9 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-muted"><Activity className="size-4" aria-hidden="true" /></span>
      <p className="mt-3 text-sm font-medium">No recent activity</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-foreground-muted">Confirmed opens, file views, downloads and copies will appear here with repository context and timing.</p>
      <Link href={hasActiveShare ? '/dashboard/shares' : '/dashboard/shares/new'} className="mt-4 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border-control bg-surface-100 px-2.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{hasActiveShare ? 'Open shares' : 'Create your first share'} <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>
  )
}

function CompactEmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center px-4 py-7 text-center sm:px-5">
      <span className="inline-flex size-9 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-muted">{icon}</span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-foreground-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

function EmptyTrend({ range }: { range: DashboardRange }) {
  return <CompactEmptyState icon={<BarChart3 className="size-4" aria-hidden="true" />} title="No confirmed views yet" description={`The last ${getRangeLabel(range)} will take shape here as viewers open a private share.`} />
}

function formatTrend(trend: DashboardMetricTrend) {
  if (trend.changePercent === null) return 'New'
  if (trend.changePercent === 0) return '0%'
  return `${trend.changePercent > 0 ? '+' : ''}${Math.round(trend.changePercent)}%`
}

function getRangeLabel(range: DashboardRange) {
  return range === '30d' ? '30 days' : '7 days'
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
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
