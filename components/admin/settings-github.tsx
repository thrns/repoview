'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowUpRight, CheckCircle2, EllipsisVertical, Github, Link2Off, RefreshCw, ShieldAlert } from 'lucide-react'

import { disconnectGitHubInstallation } from '@/app/(admin)/dashboard/settings/actions'
import { Alert, AlertDescription, Badge, Button, Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import type { SettingsInstallation } from '@/lib/auth/settings'
import type { WorkspaceQuotaUsage } from '@/lib/security/quotas'

export function SettingsGitHub({ installations, canManage, quotaUsage }: { installations: SettingsInstallation[]; canManage: boolean; quotaUsage: WorkspaceQuotaUsage }) {
  const connected = installations.filter((installation) => installation.status !== 'deleted')

  return (
    <div className="space-y-4">
      <Card>
        {connected.length > 0 ? connected.map((installation) => <GitHubInstallationRow key={installation.id} installation={installation} canManage={canManage} />) : (
          <CardContent>
            <div className="flex items-start gap-3">
              <Github className="mt-0.5 size-4 text-foreground-muted" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">No GitHub installation connected</p>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">Connect a personal account or an organization to choose private repositories for RepoView.</p>
                {canManage ? <Button asChild variant="primary" size="small" className="mt-4"><a href="/api/github/connect?return=%2Fdashboard%2Fsettings%2Fgithub">Connect GitHub <ArrowUpRight className="size-4" aria-hidden="true" /></a></Button> : null}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {installations.some((installation) => installation.status === 'deleted') ? <p className="text-xs text-foreground-muted">Disconnected installations remain listed in your account history, but cannot access repositories.</p> : null}
      {!canManage ? <p className="text-xs text-foreground-muted">Only workspace owners and admins can change GitHub connections.</p> : null}

      <Card className="bg-surface-100/70">
        <CardContent>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <p className="text-sm font-medium">Workspace capacity</p>
              <p className="mt-1 text-sm leading-5 text-foreground-muted">Secondary safeguards that protect workspace reliability.</p>
            </div>
            <p className="text-xs text-foreground-muted">Not a billing limit</p>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 sm:gap-6">
            <Capacity label="Enabled repositories" used={quotaUsage.enabledRepositories.used} limit={quotaUsage.enabledRepositories.limit} />
            <Capacity label="Active shares" used={quotaUsage.activeShares.used} limit={quotaUsage.activeShares.limit} />
            <Capacity label="Shares today" used={quotaUsage.sharesCreatedToday.used} limit={quotaUsage.sharesCreatedToday.limit} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Capacity({ label, used, limit }: { label: string; used: number; limit: number }) {
  return <div><dt className="type-meta font-medium">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{used.toLocaleString()} <span className="font-normal text-foreground-muted">/ {limit.toLocaleString()}</span></dd></div>
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
    <CardContent className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Github className="mt-0.5 size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">@{installation.githubAccountLogin}</p><Badge variant={status.variant}>{status.label}</Badge></div>
              <p className="mt-1 text-xs text-foreground-muted">{installation.githubAccountType} account · {installation.repositorySelection === 'all' ? 'All repositories' : 'Selected repositories'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:shrink-0">{canManage ? <><Button asChild variant="outline" size="small"><a href="/api/github/connect?return=%2Fdashboard%2Fsettings%2Fgithub"><RefreshCw className="size-3.5" aria-hidden="true" />Reconnect</a></Button><DropdownMenu><DropdownMenuTrigger aria-label={`More actions for @${installation.githubAccountLogin}`} className="size-9 p-0"><EllipsisVertical className="size-4" aria-hidden="true" /></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem disabled={pending} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={disconnect}><Link2Off className="size-4" aria-hidden="true" />Disconnect</DropdownMenuItem></DropdownMenuContent></DropdownMenu></> : null}</div>
      </div>
      {installation.status === 'suspended' ? <Alert className="flex items-start gap-3 border-warning/40 bg-warning/5"><ShieldAlert className="size-4 shrink-0" aria-hidden="true" /><AlertDescription>GitHub has suspended this installation. Private repository access is paused until it is restored.</AlertDescription></Alert> : null}
      <dl className="grid gap-4 py-1 sm:grid-cols-3 sm:gap-6">
          <Metric label="Repository access" value={`${installation.enabledRepositoryCount} enabled`} detail={`${installation.repositoryCount} available`} />
          <Metric label="Connection" value={status.label} detail={status.detail} />
          <Metric label="Last sync" value={installation.lastSync ? formatDate(installation.lastSync) : 'Not synced'} detail="Repository metadata" />
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-foreground-muted"><CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />Installation metadata stays server-side.</p>
          <Link href="/dashboard/repositories" className="text-xs font-medium text-foreground underline-offset-4 hover:underline">Manage repository access <span aria-hidden="true">→</span></Link>
      </div>
      {message ? <p className="text-xs text-foreground-muted" role="status">{message}</p> : null}
    </CardContent>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><dt className="type-meta font-medium">{label}</dt><dd className="mt-1 text-sm font-medium tabular-nums">{value}</dd><dd className="mt-0.5 text-xs text-foreground-muted">{detail}</dd></div>
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
