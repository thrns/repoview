import { ArrowRight, Github, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import type { Tables } from '@/lib/supabase/database.types'

export type GitHubConnectionStatus = 'success' | 'pending' | 'denied' | 'cancelled' | 'error'

export function GitHubConnectionStatusAlert({ status }: { status?: string }) {
  if (!isConnectionStatus(status)) return null

  const copy = {
    success: {
      title: 'GitHub connected',
      message: 'The installation was verified and saved to this workspace. Choose which repositories RepoView may share.',
      className: 'border-success/40 bg-success/5',
    },
    pending: {
      title: 'Organization approval pending',
      message: 'GitHub sent the installation request to an organization owner. RepoView will not use it until GitHub confirms the installation.',
      className: 'border-warning/40 bg-warning/5',
    },
    denied: {
      title: 'GitHub authorization denied',
      message: 'No GitHub installation was connected. You can try again whenever you are ready.',
      className: 'border-destructive/40 bg-destructive/5',
    },
    cancelled: {
      title: 'GitHub connection cancelled',
      message: 'No changes were made to this workspace.',
      className: 'border-border bg-muted/20',
    },
    error: {
      title: 'GitHub connection failed',
      message: 'RepoView could not verify the GitHub installation. No installation was attached to this workspace.',
      className: 'border-destructive/40 bg-destructive/5',
    },
  }[status]

  return (
    <Alert className={copy.className}>
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>{copy.message}</AlertDescription>
    </Alert>
  )
}

export function GitHubConnectionCard({
  installations,
  canConnect,
  onboarding = false,
}: {
  installations: Tables<'github_installations'>[]
  canConnect: boolean
  onboarding?: boolean
}) {
  const activeInstallations = installations.filter((installation) => installation.status === 'active' || installation.status === 'suspended')

  return (
    <Card className="overflow-hidden rounded-md border-border/70 shadow-none">
      <CardHeader className="border-b border-border/60 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-foreground">
            <Github className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <CardTitle>{onboarding ? 'Connect GitHub to get started' : 'GitHub App connections'}</CardTitle>
            <CardDescription>
              {onboarding
                ? 'Verify a GitHub account or organization, then choose the repositories available to RepoView.'
                : 'Each connected GitHub account stays isolated to this workspace and its own installation.'}
            </CardDescription>
          </div>
        </div>
        {activeInstallations.length > 0 ? <Badge variant="success">{activeInstallations.length} connected</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {activeInstallations.length > 0 ? (
          <div className="space-y-2">
            {activeInstallations.map((installation) => (
              <div key={installation.id} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/15 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{installation.github_account_login}</p>
                    <p className="text-xs text-foreground-muted">{installation.github_account_type} · {installation.repository_selection} repositories</p>
                  </div>
                </div>
                <Badge variant={installation.status === 'suspended' ? 'destructive' : 'outline'}>{installation.status}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="max-w-2xl text-sm leading-6 text-foreground-muted">
            Connect a personal account or an organization where you have permission to install the RepoView GitHub App. Organization requests may need owner approval.
          </p>
        )}
        {canConnect ? (
          <Link prefetch={false} href="/api/github/connect" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {activeInstallations.length > 0 ? 'Connect another GitHub account' : 'Connect GitHub'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
        {activeInstallations.length > 0 ? (
          <p className="text-xs text-foreground-muted">Repository access is selected separately on the Repositories page.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function isConnectionStatus(value: string | undefined): value is GitHubConnectionStatus {
  return value === 'success' || value === 'pending' || value === 'denied' || value === 'cancelled' || value === 'error'
}
