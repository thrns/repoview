import Link from 'next/link'

import { Admonition, Button, PageContainer } from '@/components/ui'
import { GitHubConnectionStatusAlert } from '@/components/admin/github-connection-card'
import { RepositoriesView, type RepositoryDashboardItem } from '@/components/admin/repositories-view'
import { listWorkspaceInstallationRepositories } from '@/lib/github/repositories'
import { GitHubRepositoryError } from '@/lib/github/types'
import { getSafeVisibilityRules } from '@/lib/security/visibility'
import { listRegisteredRepositories, syncRegisteredRepositoryMetadata } from '@/lib/repositories/registry'
import { findRegisteredRepository } from '@/lib/repositories/identity'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export default async function RepositoriesPage({ searchParams }: { searchParams?: Promise<{ github?: string | string[]; onboarding?: string | string[] }> }) {
  try {
    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-repository-sync', context.workspace.id, context.user.id)
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
      <div className="flex flex-col">
        {typeof params?.github === 'string' ? (
          <PageContainer size="large" className="shrink-0 pb-0">
            <GitHubConnectionStatusAlert status={params.github} />
          </PageContainer>
        ) : null}
        <RepositoriesView items={items} />
        {isOnboarding && hasEnabledRepository ? (
          <PageContainer size="large" className="shrink-0 pt-0">
            <div className="flex flex-col gap-3 rounded-md border border-success/40 bg-success/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-medium">Repository selection saved</p><p className="mt-1 text-sm text-foreground-muted">Create your first share to finish setup.</p></div>
              <Button asChild variant="primary" size="small"><Link href="/dashboard/shares/new?onboarding=1">Create first share</Link></Button>
            </div>
          </PageContainer>
        ) : null}
      </div>
    )
  } catch (error) {
    const message = error instanceof GitHubRepositoryError || error instanceof Error
      ? error.message
      : 'The repository registry could not be loaded.'

    return (
      <PageContainer size="large" className="space-y-6">
        <Admonition type="destructive" title="Repository list unavailable" description={message} />
      </PageContainer>
    )
  }
}
