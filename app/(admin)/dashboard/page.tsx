import { DashboardOverviewView } from '@/components/admin/dashboard-overview'
import { getDashboardOverview } from '@/lib/dashboard/overview'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    return <DashboardOverviewView data={await getDashboardOverview()} />
  } catch (error) {
    return <DashboardOverviewError schemaMissing={error instanceof Error && error.message.includes('database schema is not initialized')} />
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
