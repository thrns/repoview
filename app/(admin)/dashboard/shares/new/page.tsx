import {
  Admonition,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  PageBreadcrumbs,
  PageContainer,
} from '@/components/ui'
import Link from 'next/link'
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
      <>
        <ShareBreadcrumbs />
        <PageContainer size="medium" className="!pt-6">
        <CreateShareForm repositories={repositories} onboarding={onboarding} />
        </PageContainer>
      </>
    )
  } catch (error) {
    return (
      <>
        <ShareBreadcrumbs />
        <PageContainer size="medium" className="space-y-6 !pt-6">
          <Admonition type="destructive" title="Share form unavailable" description={error instanceof Error ? error.message : 'Try again after checking the repository configuration.'} />
          <Button asChild variant="outline">
            <Link href="/dashboard/repositories">Back to repositories</Link>
          </Button>
        </PageContainer>
      </>
    )
  }
}

function ShareBreadcrumbs() {
  return (
    <PageBreadcrumbs className="px-6 py-3 xl:px-10">
      <PageContainer size="medium" className="!px-0 !py-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/shares">Shares</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageContainer>
    </PageBreadcrumbs>
  )
}
