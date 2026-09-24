import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
import { RepositoriesView, type RepositoryDashboardItem } from '@/components/admin/repositories-view'
import { listWorkspaceInstallationRepositories } from '@/lib/github/repositories'
import { GitHubRepositoryError } from '@/lib/github/types'
import { getSafeVisibilityRules } from '@/lib/security/visibility'
import { listRegisteredRepositories } from '@/lib/repositories/registry'
import { requireWorkspace } from '@/lib/auth/workspace'

export const dynamic = 'force-dynamic'

export default async function RepositoriesPage() {
  try {
    const context = await requireWorkspace()
    const [githubRepositories, registeredRepositories] = await Promise.all([
      listWorkspaceInstallationRepositories(context.workspace.id),
      listRegisteredRepositories(),
    ])
    const localByFullName = new Map(
      registeredRepositories.map((repository) => [
        `${repository.github_owner}/${repository.github_repo}`,
        repository,
      ]),
    )
    const items: RepositoryDashboardItem[] = githubRepositories.map((github) => ({
      github,
      local: localByFullName.get(github.fullName) ?? null,
      rules: localByFullName.has(github.fullName)
        ? getSafeVisibilityRules(localByFullName.get(github.fullName)?.default_rules)
        : null,
    }))

    return <RepositoriesView items={items} />
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
