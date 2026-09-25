import { AlertTriangle, Boxes, Github, MailWarning, ShieldAlert } from 'lucide-react'

import { Badge, Card, CardContent } from '@/components/ui'
import { SendTestEmailForm } from '@/components/system-admin/send-test-email-form'
import type { SystemAdminOverview } from '@/lib/system-admin/overview'

export function SystemAdminOverviewView({ overview }: { overview: SystemAdminOverview }) {
  return (
    <div className="space-y-7">
      <header className="border-b border-border/70 pb-7">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">System administration</Badge><span className="font-mono text-[11px] text-foreground-muted">metadata only</span></div>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Platform health</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">A narrow operational view of account status, GitHub health, delivery failures, and abuse pressure. Repository source and share content are not loaded here.</p>
      </header>

      <section aria-labelledby="health-summary" className="space-y-3">
        <div className="flex items-center justify-between gap-3"><h2 id="health-summary" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">Health summary</h2><time className="text-xs text-foreground-muted" dateTime={overview.generatedAt}>Updated {formatDateTime(overview.generatedAt)}</time></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Boxes} label="Active workspaces" value={overview.workspaceCounts.active} detail={`${overview.workspaceCounts.deleting} deleting · ${overview.workspaceCounts.deleted} deleted`} />
          <MetricCard icon={Github} label="Active installations" value={overview.installationCounts.active} detail={`${overview.installationCounts.suspended} suspended · ${overview.installationCounts.pending} pending`} />
          <MetricCard icon={MailWarning} label="Notification exceptions" value={overview.failedNotifications.length} detail="Recent blocked or unresolved deliveries" tone={overview.failedNotifications.length > 0 ? 'warning' : 'default'} />
          <MetricCard icon={ShieldAlert} label="Failed webhooks" value={overview.failedWebhooks.length} detail="Recent GitHub deliveries" tone={overview.failedWebhooks.length > 0 ? 'warning' : 'default'} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <FailurePanel title="GitHub webhook failures" icon={ShieldAlert} empty="No failed GitHub webhook deliveries in the current window.">
          {overview.failedWebhooks.map((item) => <FailureRow key={item.deliveryId} title={`${item.event}.${item.action}`} detail={item.error ?? 'Processing failed'} meta={`Delivery ${item.deliveryId} · ${formatDateTime(item.receivedAt)}`} />)}
        </FailurePanel>
        <FailurePanel title="Notification exceptions" icon={MailWarning} empty="No blocked or unresolved notification deliveries in the current window.">
          {overview.failedNotifications.map((item, index) => <FailureRow key={`${item.workspaceId}-${item.createdAt}-${index}`} title={item.notificationKind} detail={item.error ?? item.status} meta={`Workspace ${shortId(item.workspaceId)} · ${formatDateTime(item.createdAt)}`} />)}
        </FailurePanel>
        <FailurePanel title="Account deletion jobs" icon={AlertTriangle} empty="No queued or failed account deletion jobs.">
          {overview.deletionJobs.map((item) => <FailureRow key={item.jobId} title={`${item.status} · ${item.phase}`} detail={item.error ?? `${item.attempts} attempt${item.attempts === 1 ? '' : 's'}`} meta={`Job ${shortId(item.jobId)} · ${formatDateTime(item.updatedAt)}`} />)}
        </FailurePanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <UsagePanel title="Rate-limit pressure" description="Counts are grouped by server-side scope. Network keys remain hashed and are not displayed.">
          {overview.rateLimitScopes.map((item) => <UsageRow key={item.scope} label={item.scope} value={item.bucketCount} />)}
        </UsagePanel>
        <UsagePanel title="Quota usage" description="Aggregate counters help identify cost pressure without exposing workspace content.">
          {overview.quotaUsage.map((item) => <UsageRow key={item.scope} label={item.scope} value={item.usage} />)}
        </UsagePanel>
      </div>

      <Card className="rounded-md border-border/70 shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-medium">Transactional email</h2><p className="mt-1 text-xs leading-5 text-foreground-muted">Send a provider health check to the configured operator mailbox. Customer workspace members cannot use this action.</p></div>
          <SendTestEmailForm />
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'default' }: { icon: typeof Boxes; label: string; value: number; detail: string; tone?: 'default' | 'warning' }) {
  return <Card className="rounded-md border-border/70 shadow-none"><CardContent className="p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">{label}</span><Icon className={tone === 'warning' ? 'size-4 text-amber-700 dark:text-amber-400' : 'size-4 text-foreground-muted'} aria-hidden="true" /></div><p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</p><p className="mt-1 text-xs leading-5 text-foreground-muted">{detail}</p></CardContent></Card>
}

function FailurePanel({ title, icon: Icon, empty, children }: { title: string; icon: typeof AlertTriangle; empty: string; children: React.ReactNode }) {
  return <Card className="rounded-md border-border/70 shadow-none"><div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />{title}</h2><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground-muted">last 12</span></div><div className="divide-y divide-border/60">{children || <p className="px-4 py-5 text-sm text-foreground-muted">{empty}</p>}</div></Card>
}

function FailureRow({ title, detail, meta }: { title: string; detail: string; meta: string }) {
  return <div className="px-4 py-3"><p className="text-sm font-medium">{title}</p><p className="mt-1 truncate text-xs text-foreground-muted" title={detail}>{detail}</p><p className="mt-1 font-mono text-[10px] text-foreground-muted">{meta}</p></div>
}

function UsagePanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="rounded-md border-border/70 shadow-none"><CardContent className="p-4"><h2 className="text-sm font-medium">{title}</h2><p className="mt-1 text-xs leading-5 text-foreground-muted">{description}</p><div className="mt-4 space-y-2">{children || <p className="text-sm text-foreground-muted">No current pressure recorded.</p>}</div></CardContent></Card>
}

function UsageRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 rounded-md bg-muted/30 px-3 py-2"><span className="truncate font-mono text-[11px] text-foreground-muted">{label}</span><span className="shrink-0 text-sm font-medium tabular-nums">{value.toLocaleString()}</span></div>
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}
