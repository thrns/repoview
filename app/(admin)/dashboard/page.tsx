import { GitHubConnectionCard } from '@/components/admin/github-connection-card'
import { DashboardOverviewView } from '@/components/admin/dashboard-overview'
import { requireWorkspace } from '@/lib/auth/workspace'
import { listWorkspaceGitHubInstallations } from '@/lib/github/client'
import { getDashboardOverview } from '@/lib/dashboard/overview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    return (
      <>
        <DashboardGitHubOnboarding />
        <DashboardOverviewView data={await getDashboardOverview()} />
      </>
    )
  } catch (error) {
    return <DashboardOverviewError schemaMissing={error instanceof Error && error.message.includes('database schema is not initialized')} />
  }
}

async function DashboardGitHubOnboarding() {
  try {
    const context = await requireWorkspace()
    const installations = await listWorkspaceGitHubInstallations(context.workspace.id, { includeInactive: true })
    if (installations.some((installation) => installation.status === 'active' || installation.status === 'suspended')) return null

    return (
      <section className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8 lg:px-10 lg:pt-9">
        <GitHubConnectionCard
          installations={installations}
          canConnect={context.membership.role === 'owner' || context.membership.role === 'admin'}
          onboarding
        />
      </section>
    )
  } catch {
    return null
  }
}

function DashboardOverviewError({ schemaMissing }: { schemaMissing: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {schemaMissing ? 'The RepoView database schema is not initialized. Run the Supabase migration files in order, then refresh this page.' : 'The dashboard overview could not be loaded. Try refreshing after checking the data connection.'}
      </div>
    </section>
  )
}
