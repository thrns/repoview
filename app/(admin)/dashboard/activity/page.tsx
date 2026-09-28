import { ActivityView } from '@/components/admin/activity-view'
import { Admonition, PageContainer } from '@/components/ui'
import { getDashboardActivity, type ActivityFilter } from '@/lib/dashboard/activity'
import { requireWorkspace } from '@/lib/auth/workspace'
import { enforceAuthenticatedRateLimit } from '../../../../lib/security/rate-limit'

export const dynamic = 'force-dynamic'

const filters = new Set<ActivityFilter>(['all', 'views', 'notifications'])

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams
  const filter = filters.has(params.filter as ActivityFilter) ? params.filter as ActivityFilter : 'all'

  try {
    const context = await requireWorkspace()
    await enforceAuthenticatedRateLimit('authenticated-dashboard-analytics', context.workspace.id, context.user.id)
    return <ActivityView items={await getDashboardActivity(filter)} filter={filter} />
  } catch {
    return <PageContainer size="default"><Admonition type="destructive" title="Activity could not be loaded" description="Try refreshing after checking the data connection." /></PageContainer>
  }
}
