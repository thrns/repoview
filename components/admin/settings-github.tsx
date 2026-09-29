'use client'

import Link from 'next/link'
import { useState, useTransition, type ReactNode } from 'react'
import { ArrowUpRight, CalendarClock, CheckCircle2, Clock3, Database, EllipsisVertical, GitBranch, Github, Link2, Link2Off, RefreshCw, Share2, ShieldAlert } from 'lucide-react'

import { disconnectGitHubInstallation } from '@/app/(admin)/dashboard/settings/actions'
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui'
import type { SettingsInstallation } from '@/lib/auth/settings'
import type { WorkspaceQuotaUsage } from '@/lib/security/quotas'

export function SettingsGitHub({ installations, canManage, quotaUsage }: { installations: SettingsInstallation[]; canManage: boolean; quotaUsage: WorkspaceQuotaUsage }) {
  const connected = installations.filter((installation) => installation.status !== 'deleted')

  return (
    <div className="space-y-4">
      {connected.length > 0 ? connected.map((installation) => <GitHubInstallationRow key={installation.id} installation={installation} canManage={canManage} />) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">
                <Github className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">No GitHub installation connected</p>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">Connect a personal account or an organization to choose private repositories for RepoView.</p>
                {canManage ? <Button asChild variant="primary" size="small" className="mt-4"><a href="/api/github/connect?return=%2Fdashboard%2Fsettings%2Fgithub">Connect GitHub <ArrowUpRight className="size-4" aria-hidden="true" /></a></Button> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {installations.some((installation) => installation.status === 'deleted') ? <p className="text-xs text-foreground-muted">Disconnected installations remain listed in your account history, but cannot access repositories.</p> : null}
      {!canManage ? <p className="text-xs text-foreground-muted">Only workspace owners and admins can change GitHub connections.</p> : null}

      <Card>
        <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h2 className="font-heading text-base font-semibold tracking-tight">Workspace capacity</h2>
            <CardDescription className="mt-1 text-sm text-foreground-muted">Secondary safeguards that protect workspace reliability.</CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 self-start">Not a billing limit</Badge>
        </CardHeader>
        <CardContent className="p-6">
          <dl className="grid divide-y divide-border sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
            <Capacity icon={<GitBranch className="size-3.5" aria-hidden="true" />} label="Enabled repositories" used={quotaUsage.enabledRepositories.used} limit={quotaUsage.enabledRepositories.limit} />
            <Capacity icon={<Share2 className="size-3.5" aria-hidden="true" />} label="Active shares" used={quotaUsage.activeShares.used} limit={quotaUsage.activeShares.limit} />
            <Capacity icon={<CalendarClock className="size-3.5" aria-hidden="true" />} label="Shares today" used={quotaUsage.sharesCreatedToday.used} limit={quotaUsage.sharesCreatedToday.limit} />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Capacity({ icon, label, used, limit }: { icon: ReactNode; label: string; used: number; limit: number }) {
  return (
    <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="type-meta font-medium">{label}</dt>
        <dd className="mt-1 font-heading text-sm font-semibold leading-6 tabular-nums">{used.toLocaleString()} <span className="font-normal text-foreground-muted">/ {limit.toLocaleString()}</span></dd>
      </div>
    </div>
  )
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
    <Card>
      <CardHeader className="space-y-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-light">
              <Github className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-heading text-base font-semibold tracking-tight">@{installation.githubAccountLogin}</h2>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="mt-1 text-xs text-foreground-muted">{installation.githubAccountType} account · {installation.repositorySelection === 'all' ? 'All repositories' : 'Selected repositories'}</p>
            </div>
          </div>
          {canManage ? <div className="flex items-center gap-2 sm:shrink-0">
            <Button asChild variant="outline" size="small"><a href="/api/github/connect?return=%2Fdashboard%2Fsettings%2Fgithub"><RefreshCw className="size-3.5" aria-hidden="true" />Reconnect</a></Button>
            <DropdownMenu>
              <DropdownMenuTrigger aria-label={`More actions for @${installation.githubAccountLogin}`} className="size-9 p-0"><EllipsisVertical className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" /></DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled={pending} className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={disconnect}><Link2Off className="size-4" aria-hidden="true" />Disconnect</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {installation.status === 'suspended' ? <Alert className="flex items-start gap-3 border-warning/40 bg-warning/5"><ShieldAlert className="size-4 shrink-0" aria-hidden="true" /><AlertDescription>GitHub has suspended this installation. Private repository access is paused until it is restored.</AlertDescription></Alert> : null}
        <dl className="grid divide-y divide-border sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
          <Metric icon={<Database className="size-3.5" aria-hidden="true" />} label="Repository access" value={`${installation.enabledRepositoryCount} enabled`} detail={`${installation.repositoryCount} available`} />
          <Metric icon={<Link2 className="size-3.5" aria-hidden="true" />} label="Connection" value={status.label} detail={status.detail} />
          <Metric icon={<Clock3 className="size-3.5" aria-hidden="true" />} label="Last sync" value={installation.lastSync ? formatDate(installation.lastSync) : 'Not synced'} detail="Repository metadata" />
        </dl>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 px-6 py-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="flex items-center gap-1.5 text-xs text-foreground-muted"><CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden="true" />Installation metadata stays server-side.</p>
          <Link href="/dashboard/repositories" className="text-xs font-medium text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">Manage repository access <span aria-hidden="true">→</span></Link>
        </div>
        {message ? <p className="border-t border-border-secondary pt-3 text-xs text-foreground-muted" role="status">{message}</p> : null}
      </CardFooter>
    </Card>
  )
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-surface-200 text-foreground-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="type-meta font-medium">{label}</dt>
        <dd className="mt-1 font-heading text-sm font-semibold leading-5 tabular-nums">{value}</dd>
        <dd className="mt-0.5 text-xs leading-5 text-foreground-muted">{detail}</dd>
      </div>
    </div>
  )
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
