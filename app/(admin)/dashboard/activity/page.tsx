import { ActivityView } from '@/components/admin/activity-view'
import { getDashboardActivity, type ActivityFilter } from '@/lib/dashboard/activity'

export const dynamic = 'force-dynamic'

const filters = new Set<ActivityFilter>(['all', 'views', 'notifications'])

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams
  const filter = filters.has(params.filter as ActivityFilter) ? params.filter as ActivityFilter : 'all'

  try {
    return <ActivityView items={await getDashboardActivity(filter)} filter={filter} />
  } catch {
    return <section className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10 lg:py-14"><div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Activity could not be loaded. Try refreshing after checking the data connection.</div></section>
  }
}
