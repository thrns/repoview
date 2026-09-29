import { redirect } from 'next/navigation'

import { DashboardOverviewView } from '@/components/admin/dashboard-overview'
import { Admonition, PageContainer } from '@/components/ui'
import { getOnboardingState } from '@/lib/auth/onboarding'
import { getDashboardOverview, normalizeDashboardRange } from '@/lib/dashboard/overview'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  try {
    const params = await searchParams
    const range = normalizeDashboardRange(params.range)
    const onboarding = await getOnboardingState()
    if (!onboarding.isComplete) redirect('/onboarding')

    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-dashboard-analytics', context.workspace.id, context.user.id)

    return (
      <DashboardOverviewView data={await getDashboardOverview(new Date(), range)} />
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
    <PageContainer size="default">
      <Admonition type="destructive" title="Dashboard overview unavailable" description={schemaMissing ? 'The RepoView database schema is not initialized. Run the Supabase migration files in order, then refresh this page.' : 'Try refreshing after checking the data connection.'} />
    </PageContainer>
  )
}
