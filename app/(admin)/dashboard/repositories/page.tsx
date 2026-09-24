import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { RepositoriesView, type RepositoryDashboardItem } from '@/components/admin/repositories-view'
import { listWorkspaceInstallationRepositories } from '@/lib/github/repositories'
import { GitHubRepositoryError } from '@/lib/github/types'
import { getSafeVisibilityRules } from '@/lib/security/visibility'
import { listRegisteredRepositories, syncRegisteredRepositoryMetadata } from '@/lib/repositories/registry'
import { findRegisteredRepository } from '@/lib/repositories/identity'
import { requireWorkspace } from '@/lib/auth/workspace'

export const dynamic = 'force-dynamic'

export default async function RepositoriesPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; onboarding?: string | string[] }> }) {
  try {
    const context = await requireWorkspace()
    const params = await searchParams
    const [githubRepositories, registeredRepositories] = await Promise.all([
      listWorkspaceInstallationRepositories(context.workspace.id),
      listRegisteredRepositories(),
    ])
    if (context.membership.role === 'owner' || context.membership.role === 'admin') {
      await syncRegisteredRepositoryMetadata(githubRepositories, registeredRepositories)
    }
    const items: RepositoryDashboardItem[] = githubRepositories.map((github) => {
      const local = findRegisteredRepository(registeredRepositories, github)
      return {
        github,
        local,
        rules: local ? getSafeVisibilityRules(local.default_rules) : null,
      }
    })

    const isOnboarding = params?.onboarding === '1'
    const hasEnabledRepository = items.some((item) => item.local?.enabled)

    return (
      <>
        {typeof params?.github === 'string' ? (
          <div className="mx-auto w-full max-w-[1400px] px-5 pt-7 sm:px-8 lg:px-10 lg:pt-9">
            <GitHubConnectionStatusAlert status={params.github} />
          </div>
        ) : null}
        <RepositoriesView items={items} />
        {isOnboarding && hasEnabledRepository ? (
          <div className="mx-auto w-full max-w-[1400px] px-5 pb-8 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-3 rounded-md border border-success/40 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium">Repository selection saved</p><p className="mt-1 text-sm text-foreground-muted">Create your first share to finish setup.</p></div>
              <Link href="/dashboard/shares/new?onboarding=1" className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Create first share</Link>
            </div>
          </div>
        ) : null}
      </>
    )
  } catch (error) {
    const message = error instanceof GitHubRepositoryError || error instanceof Error
      ? error.message
      : 'The repository registry could not be loaded.'

    return (
      <section className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <header className="border-b border-border/70 pb-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-foreground-muted">GitHub App installation</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em]">Repositories</h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">Manage the repositories available to RepoView shares.</p>
        </header>
        <Card className="rounded-md border-border/70 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <Alert className="border-destructive/40 bg-destructive/5">
              <AlertTitle>Repository list unavailable</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    )
  }
}
