import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui'
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
      <section className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8 lg:py-9">
        <div className="mb-8">
          <Link href="/dashboard/shares" className="text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Shares <span className="px-1 text-foreground-muted/60">/</span> New
          </Link>
          <h1 className="mt-3 font-heading text-[28px] font-semibold tracking-[-0.03em]">Create a share</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-5 text-foreground-muted">Share one repository ref with a specific recipient without granting repository access.</p>
        </div>
        <CreateShareForm repositories={repositories} onboarding={onboarding} />
      </section>
    )
  } catch (error) {
    return (
      <section className="mx-auto w-full max-w-3xl space-y-6 px-5 py-7 sm:px-8 lg:py-9">
        <div>
          <Link href="/dashboard/shares" className="text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Shares <span className="px-1 text-foreground-muted/60">/</span> New
          </Link>
          <h1 className="mt-3 font-heading text-[28px] font-semibold tracking-[-0.03em]">Create a share</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">Repository refs could not be loaded.</p>
        </div>
        <Alert className="border-destructive/40" role="alert">
          <AlertTitle>Share form unavailable</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : 'Try again after checking the repository configuration.'}</AlertDescription>
        </Alert>
        <Link
          href="/dashboard/repositories"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to repositories
        </Link>
      </section>
    )
  }
}
