'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowUpRight, CheckCircle2, Github, Link2Off, RefreshCw, ShieldAlert } from 'lucide-react'

import { disconnectGitHubInstallation } from '@/app/(admin)/dashboard/settings/actions'
import { Alert, AlertDescription, Badge, Button } from '@/components/ui'
import type { SettingsInstallation } from '@/lib/auth/settings'
import type { WorkspaceQuotaUsage } from '@/lib/security/quotas'

export function SettingsGitHub({ installations, canManage, quotaUsage }: { installations: SettingsInstallation[]; canManage: boolean; quotaUsage: WorkspaceQuotaUsage }) {
  const connected = installations.filter((installation) => installation.status !== 'deleted')

  return (
    <div className="space-y-4">
      {connected.length > 0 ? connected.map((installation) => <GitHubInstallationRow key={installation.id} installation={installation} canManage={canManage} />) : (
        <div className="rounded-md border border-dashed border-border-strong bg-muted/15 p-5">
          <div className="flex items-start gap-3">
            <Github className="mt-0.5 size-4 text-foreground-muted" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">No GitHub installation connected</p>
              <p className="mt-1 text-sm leading-6 text-foreground-muted">Connect a personal account or an organization to choose private repositories for RepoView.</p>
              {canManage ? <Link prefetch={false} href="/api/github/connect?return=%2Fdashboard%2Fsettings" className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Connect GitHub <ArrowUpRight className="size-4" aria-hidden="true" /></Link> : null}
            </div>
          </div>
        </div>
      )}
      {installations.some((installation) => installation.status === 'deleted') ? <p className="text-xs text-foreground-muted">Disconnected installations remain listed in your account history, but cannot access repositories.</p> : null}
      {!canManage ? <p className="text-xs text-foreground-muted">Only workspace owners and admins can change GitHub connections.</p> : null}
      <div className="rounded-md border border-border/70 bg-muted/15 p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">Workspace capacity</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Capacity label="Enabled repositories" used={quotaUsage.enabledRepositories.used} limit={quotaUsage.enabledRepositories.limit} />
          <Capacity label="Active shares" used={quotaUsage.activeShares.used} limit={quotaUsage.activeShares.limit} />
          <Capacity label="Shares today" used={quotaUsage.sharesCreatedToday.used} limit={quotaUsage.sharesCreatedToday.limit} />
        </div>
        <p className="mt-3 text-xs leading-5 text-foreground-muted">These generous safeguards protect workspace reliability and are not billing limits.</p>
      </div>
    </div>
  )
}

function Capacity({ label, used, limit }: { label: string; used: number; limit: number }) {
  return <div><p className="text-xs text-foreground-muted">{label}</p><p className="mt-1 text-sm font-medium tabular-nums">{used.toLocaleString()} <span className="font-normal text-foreground-muted">/ {limit.toLocaleString()}</span></p></div>
}

function GitHubInstallationRow({ installation, canManage }: { installation: SettingsInstallation; canManage: boolean }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const status = getStatusCopy(installation.status)

  function disconnect() {
    if (!window.confirm(`Disconnect @${installation.githubAccountLogin} from this workspace? Existing shares will stop working.`)) return
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await disconnectGitHubInstallation(installation.id)
        setMessage(result.disconnected ? 'Disconnected. Repository access is closed.' : result.error)
      } catch {
        setMessage('The GitHub connection could not be disconnected.')
      }
    })
  }

  return (
    <div className="rounded-md border border-border/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40"><Github className="size-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">@{installation.githubAccountLogin}</p><Badge variant={status.variant}>{status.label}</Badge></div>
            <p className="mt-1 text-xs text-foreground-muted">{installation.githubAccountType} account · {installation.repositorySelection === 'all' ? 'All repositories' : 'Selected repositories'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">{canManage ? <><Link prefetch={false} href="/api/github/connect?return=%2Fdashboard%2Fsettings" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RefreshCw className="size-3.5" aria-hidden="true" />Reconnect</Link><Button type="button" variant="text" size="small" loading={pending} onClick={disconnect} icon={<Link2Off className="size-3.5" aria-hidden="true" />}>Disconnect</Button></> : null}</div>
      </div>
      {installation.status === 'suspended' ? <Alert className="mt-4 border-warning/40 bg-warning/5"><ShieldAlert className="size-4" aria-hidden="true" /><AlertDescription>GitHub has suspended this installation. Private repository access is paused until it is restored.</AlertDescription></Alert> : null}
      <div className="mt-4 grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3"><Metric label="Repository access" value={`${installation.enabledRepositoryCount} enabled`} detail={`${installation.repositoryCount} available`} /><Metric label="Connection" value={status.label} detail={status.detail} /><Metric label="Last sync" value={installation.lastSync ? formatDate(installation.lastSync) : 'Not synced'} detail="Repository metadata" /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4"><p className="flex items-center gap-1.5 text-xs text-foreground-muted"><CheckCircle2 className="size-3.5 text-success" aria-hidden="true" /> Installation metadata stays server-side.</p><Link href="/dashboard/repositories" className="text-xs font-medium text-foreground underline-offset-4 hover:underline">Manage repository access <span aria-hidden="true">→</span></Link></div>
      {message ? <p className="mt-3 text-xs text-foreground-muted" role="status">{message}</p> : null}
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">{label}</p><p className="mt-1 text-sm font-medium tabular-nums">{value}</p><p className="mt-0.5 text-xs text-foreground-muted">{detail}</p></div>
}

function getStatusCopy(status: SettingsInstallation['status']) {
  if (status === 'active') return { label: 'Connected', detail: 'Access is available', variant: 'success' as const }
  if (status === 'suspended') return { label: 'Suspended', detail: 'Access is paused', variant: 'destructive' as const }
  if (status === 'pending_migration') return { label: 'Needs reconnect', detail: 'Legacy connection', variant: 'outline' as const }
  return { label: 'Disconnected', detail: 'Access is closed', variant: 'outline' as const }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
