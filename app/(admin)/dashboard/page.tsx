import Link from 'next/link'

import { DashboardOverviewView } from '@/components/admin/dashboard-overview'
import { Badge, Card, CardContent } from '@/components/ui'
import { getOnboardingLabel, getOnboardingState } from '@/lib/auth/onboarding'
import { getDashboardOverview } from '@/lib/dashboard/overview'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    const onboarding = await getOnboardingState()
    if (!onboarding.isComplete) return <DashboardOnboardingState step={onboarding.step} hasPendingGitHubConnection={onboarding.hasPendingGitHubConnection} />

    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-dashboard-analytics', context.workspace.id, context.user.id)

    return (
      <DashboardOverviewView data={await getDashboardOverview()} />
    )
  } catch (error) {
    return <DashboardOverviewError schemaMissing={error instanceof Error && error.message.includes('database schema is not initialized')} />
  }
}

function DashboardOnboardingState({ step, hasPendingGitHubConnection }: { step: Parameters<typeof getOnboardingLabel>[0]; hasPendingGitHubConnection: boolean }) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="space-y-3">
        <Badge variant="outline">Workspace setup</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Finish setting up RepoView</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground-muted">Your personal workspace is ready. Complete one short step to unlock the dashboard.</p>
      </header>
      <Card className="max-w-2xl rounded-md border-border/70 shadow-none">
        <CardContent className="space-y-4 p-6">
          <div><p className="text-sm font-medium">Next: {getOnboardingLabel(step)}</p><p className="mt-1 text-sm leading-6 text-foreground-muted">{step === 'github' && hasPendingGitHubConnection ? 'GitHub may be waiting for organization approval. You can review the connection and return here later.' : 'RepoView saves your progress, so you can leave and continue whenever you’re ready.'}</p></div>
          <Link href="/onboarding" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Continue setup</Link>
        </CardContent>
      </Card>
    </section>
  )
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
