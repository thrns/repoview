import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle, Card, CardContent } from '@/components/ui'
import { CreateShareForm, type ShareFormRepository } from '@/components/admin/create-share-form'
import { listRepositoryBranches } from '@/lib/github/repositories'
import { listRegisteredRepositories } from '@/lib/repositories/registry'
import { synchronizeRepositoryForGitHub } from '@/lib/repositories/synchronize'
import { requireWorkspace } from '@/lib/auth/workspace'

export const dynamic = 'force-dynamic'

export default async function NewSharePage({ searchParams }: { searchParams?: Promise<{ onboarding?: string | string[] }> }) {
  const params = await searchParams
  const onboarding = params?.onboarding === '1'
  try {
    const context = await requireWorkspace()
    const storedRepositories = (await listRegisteredRepositories()).filter((repository) => repository.enabled)
    const repositories: ShareFormRepository[] = await Promise.all(storedRepositories.map(async (repository) => {
      const { repository: synchronizedRepository } = await synchronizeRepositoryForGitHub(repository.id, context.workspace.id, 'member')
      if (!synchronizedRepository.enabled) throw new Error('A selected repository is no longer enabled.')
      const branches = await listRepositoryBranches(
        synchronizedRepository.github_owner,
        synchronizedRepository.github_repo,
        synchronizedRepository.github_installation_id,
        context.workspace.id,
        'member',
      )
      const branchNames = branches.map((branch) => branch.name)
      if (!branchNames.includes(synchronizedRepository.default_branch)) {
        branchNames.unshift(synchronizedRepository.default_branch)
      }
      return {
        id: synchronizedRepository.id,
        fullName: `${synchronizedRepository.github_owner}/${synchronizedRepository.github_repo}`,
        defaultBranch: synchronizedRepository.default_branch,
        branches: branchNames,
      }
    }))

    return (
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-sm text-foreground-muted">Shares / New</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Create a share</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">Create a recipient-specific, read-only view of a private repository.</p>
        </div>
        <CreateShareForm repositories={repositories} onboarding={onboarding} />
      </div>
    )
  } catch (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Create a share</h1>
          <p className="mt-2 text-sm text-foreground-muted">Repository refs could not be loaded.</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert className="border-destructive/40">
              <AlertTitle>Share form unavailable</AlertTitle>
              <AlertDescription>{error instanceof Error ? error.message : 'Try again after checking the repository configuration.'}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        <Link
          href="/dashboard/repositories"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to repositories
        </Link>
      </div>
    )
  }
}
