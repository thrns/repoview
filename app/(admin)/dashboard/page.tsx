import { redirect } from 'next/navigation'

import { DashboardOverviewView } from '@/components/admin/dashboard-overview'
import { getOnboardingState } from '@/lib/auth/onboarding'
import { getDashboardOverview } from '@/lib/dashboard/overview'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    const onboarding = await getOnboardingState()
    if (!onboarding.isComplete) redirect('/onboarding')

    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-dashboard-analytics', context.workspace.id, context.user.id)

    return (
      <DashboardOverviewView data={await getDashboardOverview()} />
    )
  } catch (error) {
    if (isRedirectError(error)) throw error
    return <DashboardOverviewError schemaMissing={error instanceof Error && error.message.includes('database schema is not initialized')} />
  }
}

function isRedirectError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT'))
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
